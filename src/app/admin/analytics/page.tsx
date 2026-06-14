"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface FunnelStage {
  stage: string
  count: number
  percentage: number
}

interface PassRateByCategory {
  category: string
  total: number
  passed: number
  passRate: number
  avgScore: number
}

interface PassRateByProblem {
  problemId: string
  problemTitle: string
  slug: string
  total: number
  passed: number
  passRate: number
  avgScore: number
}

interface CohortStats {
  cohort: string
  total: number
  submitted: number
  evaluated: number
  selected: number
  avgScore: number
  avgTimeMinutes: number | null
}

interface TimingStats {
  averageSeconds: number | null
  medianSeconds: number | null
  minSeconds: number | null
  maxSeconds: number | null
  distribution: { bucket: string; count: number }[]
}

interface TotalsData {
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

interface AnalyticsData {
  funnel: FunnelStage[]
  passRates: {
    byCategory: PassRateByCategory[]
    byProblem: PassRateByProblem[]
  }
  cohorts: CohortStats[]
  timing: TimingStats
  totals: TotalsData
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "—"
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

function formatCohort(cohort: string): string {
  const [y, m] = cohort.split("-")
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${months[Number.parseInt(m) - 1]} ${y}`
}

const STAGE_LABELS: Record<string, string> = {
  REGISTERED: "Registered",
  ASSESSMENT_COMPLETED: "Assessment Done",
  PROBLEM_ASSIGNED: "Problem Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  SELECTED: "Selected",
  REJECTED: "Rejected",
}

const STAGE_COLORS: Record<string, string> = [
  "bg-slate-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-red-500",
].reduce(
  (acc, color, i) => {
    const keys = Object.keys(STAGE_LABELS)
    acc[keys[i]!] = color
    return acc
  },
  {} as Record<string, string>,
)

// ─── Funnel Bar ───────────────────────────────────────────────────────────────

function FunnelBar({ stage, count, percentage, maxCount }: FunnelStage & { maxCount: number }) {
  const label = STAGE_LABELS[stage] || stage.replace(/_/g, " ").toLowerCase()
  const color = STAGE_COLORS[stage] || "bg-gray-500"
  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

  return (
    <div className="flex items-center gap-3 group">
      {/* Stage Label */}
      <span className="text-xs font-mono text-muted-foreground w-32 shrink-0 text-right truncate">
        {label}
      </span>

      {/* Arrow connector */}
      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />

      {/* Bar Container */}
      <div className="flex-1 h-8 bg-muted/50 rounded-sm overflow-hidden relative">
        <div
          className={`h-full ${color} opacity-80 rounded-sm transition-all duration-500 ease-out relative`}
          style={{ width: `${barWidth}%` }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        {/* Count overlay */}
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-sm font-mono font-bold text-foreground/90 drop-shadow-sm">
            {count}
          </span>
        </div>
      </div>

      {/* Percentage badge */}
      <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
        {percentage}%
      </span>
    </div>
  )
}

// ─── Pass Rate Bar ────────────────────────────────────────────────────────────

function PassRateBar({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-5 bg-muted/50 rounded-sm overflow-hidden">
        <div
          className={`h-full ${color} rounded-sm transition-all duration-500`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right tabular-nums">{value}%</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router])

  async function fetchAnalytics() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/analytics")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "Failed to fetch analytics")
      }
      const json = await res.json()
      setData(json as AnalyticsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      toast.error(message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ── Loading State ──────────────────────────────────────────────────────────

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading analytics..." />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive text-sm font-mono">{error}</p>
        <Button variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { funnel, passRates, cohorts, timing, totals } = data
  const maxFunnelCount = Math.max(...funnel.map((f) => f.count), 1)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground text-sm font-mono">
            Pipeline metrics, pass rates &amp; cohort analysis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Total Candidates
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.totalCandidates}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-blue-950/30">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Completion Rate
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.completionRate}%
                </p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-950/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Average Score
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.avgScore}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-indigo-950/30">
                <Activity className="h-6 w-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Active Cycles
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.activeCycles}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-purple-950/30">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Second Row Stats ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Submissions
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.totalSubmissions}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-amber-950/30">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Evaluations
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.completedEvaluations}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{totals.totalEvaluations}
                  </span>
                </p>
              </div>
              <div className="rounded-xl p-3 bg-cyan-950/30">
                <BarChart3 className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Selected
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.selectedCount}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-950/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Invited
                </p>
                <p className="text-3xl font-bold font-mono mt-1 tabular-nums">
                  {totals.totalInvited}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-slate-950/30">
                <Users className="h-6 w-6 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Funnel Visualization ──────────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Candidate Funnel
          </CardTitle>
          <CardDescription>
            Pipeline progression from registration through selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnel.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                No candidate data available
              </p>
            ) : (
              funnel.map((stage) => (
                <FunnelBar
                  key={stage.stage}
                  {...stage}
                  maxCount={maxFunnelCount}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Pass Rates ────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Pass Rates by Category
            </CardTitle>
            <CardDescription>
              Evaluation pass rates grouped by skill category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passRates.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                No evaluations completed yet
              </p>
            ) : (
              <div className="space-y-4">
                {passRates.byCategory.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono font-medium">
                        {cat.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {cat.passed}/{cat.total} &middot; avg {cat.avgScore}
                      </span>
                    </div>
                    <PassRateBar value={cat.passRate} label={cat.category} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Problem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Pass Rates by Problem
            </CardTitle>
            <CardDescription>
              Evaluation pass rates per problem template
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passRates.byProblem.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                No evaluations completed yet
              </p>
            ) : (
              <div className="space-y-4">
                {passRates.byProblem.slice(0, 15).map((prob) => (
                  <div key={prob.problemId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono font-medium truncate max-w-[200px]">
                        {prob.problemTitle}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {prob.passed}/{prob.total} &middot; avg {prob.avgScore}
                      </span>
                    </div>
                    <PassRateBar value={prob.passRate} label={prob.problemTitle} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Timing Metrics ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Timing Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Time to Complete
            </CardTitle>
            <CardDescription>
              Time taken from problem assignment to submission
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timing.averageSeconds === null ? (
              <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                No timing data available
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    Average
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {formatSeconds(timing.averageSeconds)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    Median
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {formatSeconds(timing.medianSeconds)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    Fastest
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {formatSeconds(timing.minSeconds)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    Slowest
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {formatSeconds(timing.maxSeconds)}
                  </p>
                </div>
              </div>
            )}

            {/* Timing Distribution */}
            {timing.distribution.length > 0 && (
              <div>
                <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  Distribution
                </h4>
                <div className="space-y-1.5">
                  {timing.distribution.map((d) => {
                    const maxDist = Math.max(...timing.distribution.map((x) => x.count), 1)
                    const width = (d.count / maxDist) * 100
                    return (
                      <div key={d.bucket} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 text-right">
                          {d.bucket}
                        </span>
                        <div className="flex-1 h-5 bg-muted/50 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-sm transition-all duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-8 text-right tabular-nums">
                          {d.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cohort Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Cohort Comparison
            </CardTitle>
            <CardDescription>
              Performance across registration cohorts by month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                No cohort data available
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs">Cohort</TableHead>
                      <TableHead className="font-mono text-xs text-right">Total</TableHead>
                      <TableHead className="font-mono text-xs text-right">Submitted</TableHead>
                      <TableHead className="font-mono text-xs text-right">Eval&apos;d</TableHead>
                      <TableHead className="font-mono text-xs text-right">Selected</TableHead>
                      <TableHead className="font-mono text-xs text-right">Avg Score</TableHead>
                      <TableHead className="font-mono text-xs text-right">Avg Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.map((c) => (
                      <TableRow key={c.cohort}>
                        <TableCell className="font-mono text-xs">
                          <Badge variant="outline" className="font-mono">
                            {formatCohort(c.cohort)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right tabular-nums">
                          {c.total}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right tabular-nums">
                          {c.submitted}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right tabular-nums">
                          {c.evaluated}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right tabular-nums">
                          <Badge
                            variant="secondary"
                            className={
                              c.selected > 0
                                ? "bg-emerald-950/40 text-emerald-400 font-mono"
                                : "font-mono"
                            }
                          >
                            {c.selected}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right tabular-nums">
                          {c.avgScore > 0 ? c.avgScore : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right tabular-nums">
                          {c.avgTimeMinutes !== null
                            ? `${c.avgTimeMinutes}m`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Full Pass Rate Table ──────────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Detailed Pass Rates by Problem
          </CardTitle>
          <CardDescription>
            All evaluated problems with pass/fail breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passRates.byProblem.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono py-4 text-center">
              No evaluations completed yet
            </p>
          ) : (
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">Problem</TableHead>
                    <TableHead className="font-mono text-xs text-right">Total</TableHead>
                    <TableHead className="font-mono text-xs text-right">Passed</TableHead>
                    <TableHead className="font-mono text-xs text-right">Pass Rate</TableHead>
                    <TableHead className="font-mono text-xs text-right">Avg Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passRates.byProblem.map((prob) => (
                    <TableRow key={prob.problemId}>
                      <TableCell className="font-mono text-xs font-medium">
                        {prob.problemTitle}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right tabular-nums">
                        {prob.total}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right tabular-nums">
                        <span className="text-emerald-400">{prob.passed}</span>
                        <span className="text-muted-foreground">
                          /{prob.total}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right tabular-nums">
                        <Badge
                          variant="secondary"
                          className={
                            prob.passRate >= 70
                              ? "bg-emerald-950/40 text-emerald-400"
                              : prob.passRate >= 50
                                ? "bg-amber-950/40 text-amber-400"
                                : "bg-red-950/40 text-red-400"
                          }
                        >
                          {prob.passRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right tabular-nums">
                        {prob.avgScore}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
