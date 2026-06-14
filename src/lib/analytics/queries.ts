import prisma from "@/lib/prisma"

// ─── Funnel Stats ────────────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string
  count: number
  percentage: number
}

export async function getFunnelStats(): Promise<FunnelStage[]> {
  const total = await prisma.user.count({ where: { role: "CANDIDATE" } })

  const statusCounts = await prisma.user.groupBy({
    by: ["status"],
    where: { role: "CANDIDATE" },
    _count: true,
  })

  const STATUS_ORDER = [
    "REGISTERED",
    "ASSESSMENT_COMPLETED",
    "PROBLEM_ASSIGNED",
    "IN_PROGRESS",
    "SUBMITTED",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "SELECTED",
    "REJECTED",
  ]

  const countMap = new Map<string, number>()
  for (const s of statusCounts) {
    countMap.set(s.status, s._count)
  }

  return STATUS_ORDER.map((stage) => {
    const count = countMap.get(stage) ?? 0
    return {
      stage,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }
  })
}

// ─── Pass Rates ───────────────────────────────────────────────────────────────

export interface PassRateByCategory {
  category: string
  total: number
  passed: number
  passRate: number
  avgScore: number
}

export interface PassRateByProblem {
  problemId: string
  problemTitle: string
  slug: string
  total: number
  passed: number
  passRate: number
  avgScore: number
}

export async function getPassRatesByCategory(): Promise<PassRateByCategory[]> {
  const categories = await prisma.problemTemplate.groupBy({
    by: ["category"],
    _count: { id: true },
  })

  const results: PassRateByCategory[] = []

  for (const cat of categories) {
    const templates = await prisma.problemTemplate.findMany({
      where: { category: cat.category },
      select: { id: true },
    })
    const templateIds = templates.map((t) => t.id)

    const evaluations = await prisma.evaluation.findMany({
      where: {
        status: "COMPLETED",
        submission: {
          assignedProblem: {
            problemTemplateId: { in: templateIds },
          },
        },
      },
      select: { totalScore: true },
    })

    const total = evaluations.length
    const passed = evaluations.filter((e) => e.totalScore >= 70).length
    const avgScore =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.totalScore, 0) / total) * 10
          ) / 10
        : 0

    results.push({
      category: cat.category,
      total,
      passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgScore,
    })
  }

  return results.sort((a, b) => b.total - a.total)
}

export async function getPassRatesByProblem(): Promise<PassRateByProblem[]> {
  const templates = await prisma.problemTemplate.findMany({
    where: { isActive: true },
    select: { id: true, title: true, slug: true },
  })

  const results: PassRateByProblem[] = []

  for (const tpl of templates) {
    const evaluations = await prisma.evaluation.findMany({
      where: {
        status: "COMPLETED",
        submission: {
          assignedProblem: {
            problemTemplateId: tpl.id,
          },
        },
      },
      select: { totalScore: true },
    })

    const total = evaluations.length
    const passed = evaluations.filter((e) => e.totalScore >= 70).length
    const avgScore =
      total > 0
        ? Math.round(
            (evaluations.reduce((sum, e) => sum + e.totalScore, 0) / total) * 10
          ) / 10
        : 0

    results.push({
      problemId: tpl.id,
      problemTitle: tpl.title,
      slug: tpl.slug,
      total,
      passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgScore,
    })
  }

  return results.sort((a, b) => b.total - a.total)
}

// ─── Cohort Comparison ────────────────────────────────────────────────────────

export interface CohortStats {
  cohort: string
  total: number
  submitted: number
  evaluated: number
  selected: number
  avgScore: number
  avgTimeMinutes: number | null
}

export async function getCohortComparison(): Promise<CohortStats[]> {
  // Group users by month of registration
  const users = await prisma.user.findMany({
    where: { role: "CANDIDATE" },
    select: { id: true, createdAt: true, status: true },
  })

  const cohortMap = new Map<string, CohortStats>()

  for (const user of users) {
    const cohort = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, "0")}`

    if (!cohortMap.has(cohort)) {
      cohortMap.set(cohort, {
        cohort,
        total: 0,
        submitted: 0,
        evaluated: 0,
        selected: 0,
        avgScore: 0,
        avgTimeMinutes: null,
      })
    }

    const entry = cohortMap.get(cohort)!
    entry.total++

    if (
      user.status === "SUBMITTED" ||
      user.status === "UNDER_REVIEW" ||
      user.status === "SHORTLISTED" ||
      user.status === "SELECTED" ||
      user.status === "REJECTED"
    ) {
      entry.submitted++
    }

    if (user.status === "SELECTED") {
      entry.selected++
    }
  }

  // Fetch evaluated counts and avg scores per cohort by joining through submissions
  const cohorts = Array.from(cohortMap.keys())

  for (const cohort of cohorts) {
    const entry = cohortMap.get(cohort)!
    const [yearStr, monthStr] = cohort.split("-")
    const year = Number.parseInt(yearStr)
    const month = Number.parseInt(monthStr) - 1
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 1)

    const evaluationsInCohort = await prisma.evaluation.findMany({
      where: {
        status: "COMPLETED",
        submission: {
          user: {
            role: "CANDIDATE",
            createdAt: { gte: startDate, lt: endDate },
          },
        },
      },
      select: { totalScore: true, submission: { select: { elapsedSeconds: true } } },
    })

    entry.evaluated = evaluationsInCohort.length

    if (evaluationsInCohort.length > 0) {
      entry.avgScore =
        Math.round(
          (evaluationsInCohort.reduce((sum, e) => sum + e.totalScore, 0) /
            evaluationsInCohort.length) *
            10
        ) / 10

      const times = evaluationsInCohort
        .map((e) => e.submission.elapsedSeconds)
        .filter((t): t is number => t !== null)

      if (times.length > 0) {
        entry.avgTimeMinutes = Math.round(
          (times.reduce((sum, t) => sum + t, 0) / times.length / 60) * 10
        ) / 10
      }
    }
  }

  const result = Array.from(cohortMap.values())
  return result.sort((a, b) => a.cohort.localeCompare(b.cohort))
}

// ─── Timing Metrics ──────────────────────────────────────────────────────────

export interface TimingStats {
  averageSeconds: number | null
  medianSeconds: number | null
  minSeconds: number | null
  maxSeconds: number | null
  distribution: { bucket: string; count: number }[]
}

export async function getTimingMetrics(): Promise<TimingStats> {
  const submissions = await prisma.submission.findMany({
    where: { elapsedSeconds: { not: null } },
    select: { elapsedSeconds: true },
  })

  const times = submissions
    .map((s) => s.elapsedSeconds)
    .filter((t): t is number => t !== null)

  if (times.length === 0) {
    return {
      averageSeconds: null,
      medianSeconds: null,
      minSeconds: null,
      maxSeconds: null,
      distribution: [],
    }
  }

  times.sort((a, b) => a - b)

  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  const median =
    times.length % 2 === 0
      ? Math.round((times[times.length / 2 - 1]! + times[times.length / 2]!) / 2)
      : times[Math.floor(times.length / 2)]!
  const min = times[0]!
  const max = times[times.length - 1]!

  // Distribution buckets (in minutes): <30, 30-60, 60-90, 90-120, 120-180, 180-240, 240+
  const BUCKETS = [
    { label: "< 30 min", minSec: 0, maxSec: 30 * 60 },
    { label: "30-60 min", minSec: 30 * 60, maxSec: 60 * 60 },
    { label: "60-90 min", minSec: 60 * 60, maxSec: 90 * 60 },
    { label: "90-120 min", minSec: 90 * 60, maxSec: 120 * 60 },
    { label: "2-3 hr", minSec: 120 * 60, maxSec: 180 * 60 },
    { label: "3-4 hr", minSec: 180 * 60, maxSec: 240 * 60 },
    { label: "4+ hr", minSec: 240 * 60, maxSec: Infinity },
  ]

  const distribution = BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    count: times.filter((t) => t >= bucket.minSec && t < bucket.maxSec).length,
  }))

  return {
    averageSeconds: avg,
    medianSeconds: median,
    minSeconds: min,
    maxSeconds: max,
    distribution,
  }
}

// ─── Totals / Summary ────────────────────────────────────────────────────────

export interface TotalsData {
  totalCandidates: number
  totalInvited: number
  totalAssessed: number
  totalProblemsAssigned: number
  totalSubmissions: number
  totalEvaluations: number
  completedEvaluations: number
  selectedCount: number
  completionRate: number
  avgScore: number
  activeCycles: number
}

export async function getTotals(): Promise<TotalsData> {
  const totalCandidates = await prisma.user.count({ where: { role: "CANDIDATE" } })
  const totalInvited = await prisma.invite.count()
  const totalSubmissions = await prisma.submission.count()
  const totalEvaluations = await prisma.evaluation.count()
  const completedEvaluations = await prisma.evaluation.count({
    where: { status: "COMPLETED" },
  })

  const totalAssessed = await prisma.user.count({
    where: { role: "CANDIDATE", status: { not: "REGISTERED" } },
  })

  const totalProblemsAssigned = await prisma.assignedProblem.count()

  const selectedCount = await prisma.user.count({
    where: { role: "CANDIDATE", status: "SELECTED" },
  })

  // Average score across completed evaluations
  const scores = await prisma.evaluation.findMany({
    where: { status: "COMPLETED" },
    select: { totalScore: true },
  })

  const avgScore =
    scores.length > 0
      ? Math.round(
          (scores.reduce((s, e) => s + e.totalScore, 0) / scores.length) * 10
        ) / 10
      : 0

  // Approximate active cycles: distinct months with invites or registrations
  const [inviteMonths, userMonths] = await Promise.all([
    prisma.invite.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { role: "CANDIDATE" },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ])

  const monthsSet = new Set<string>()
  for (const i of inviteMonths) {
    monthsSet.add(`${i.createdAt.getFullYear()}-${i.createdAt.getMonth()}`)
  }
  for (const u of userMonths) {
    monthsSet.add(`${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`)
  }

  const completionRate =
    totalProblemsAssigned > 0
      ? Math.round((totalSubmissions / totalProblemsAssigned) * 100)
      : 0

  return {
    totalCandidates,
    totalInvited,
    totalAssessed,
    totalProblemsAssigned,
    totalSubmissions,
    totalEvaluations,
    completedEvaluations,
    selectedCount,
    completionRate,
    avgScore,
    activeCycles: monthsSet.size,
  }
}

// ─── Full Analytics Payload ───────────────────────────────────────────────────

export interface AnalyticsData {
  funnel: FunnelStage[]
  passRates: {
    byCategory: PassRateByCategory[]
    byProblem: PassRateByProblem[]
  }
  cohorts: CohortStats[]
  timing: TimingStats
  totals: TotalsData
}

export async function getFullAnalytics(): Promise<AnalyticsData> {
  const [funnel, byCategory, byProblem, cohorts, timing, totals] =
    await Promise.all([
      getFunnelStats(),
      getPassRatesByCategory(),
      getPassRatesByProblem(),
      getCohortComparison(),
      getTimingMetrics(),
      getTotals(),
    ])

  return {
    funnel,
    passRates: { byCategory, byProblem },
    cohorts,
    timing,
    totals,
  }
}
