// ─── Interview Scorecard Generator ───────────────────────────────────────────
//
// Generates a structured scorecard from InterviewScore records stored in DB.
// Pure DB + logic — no LLM calls, no HTTP requests to external services.
//
// Verdict thresholds (overallScore 0–100):
//   STRONG_HIRE : >= 85
//   HIRE        : >= 70
//   BORDERLINE  : >= 55
//   NO_HIRE     :  < 55

import { prisma } from "@/lib/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoredDimension {
  dimensionId: string
  name: string
  score: number
  maxScore: number
  notes: string
  weightedContribution: number
}

export interface InterviewScorecard {
  interviewId: string
  candidateId: string
  /** Weighted average of all dimensions, 0–100 */
  overallScore: number
  dimensions: ScoredDimension[]
  verdict: "STRONG_HIRE" | "HIRE" | "BORDERLINE" | "NO_HIRE"
  /** Top 2 highest-scoring dimension names */
  strengths: string[]
  /** Bottom 2 lowest-scoring dimension names */
  gaps: string[]
  /** evaluatorNotes from the Interview record, or empty string */
  summaryNotes: string
  /** True if any ScoringDimension name contains "AI" (case-insensitive) */
  aiCapabilityEnabled: boolean
  /** ISO timestamp when this scorecard was generated */
  generatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function determineVerdict(score: number): InterviewScorecard["verdict"] {
  if (score >= 85) return "STRONG_HIRE"
  if (score >= 70) return "HIRE"
  if (score >= 55) return "BORDERLINE"
  return "NO_HIRE"
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches Interview + InterviewScores + ScoringDimensions from the DB,
 * computes a weighted overall score, identifies strengths/gaps, and
 * returns a fully populated InterviewScorecard.
 *
 * Throws "Interview not found"    – if the ID does not exist.
 * Throws "Interview has no scores" – if no InterviewScore records exist for it.
 */
export async function generateScorecard(
  interviewId: string
): Promise<InterviewScorecard> {
  // 1. Fetch the interview
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { id: true, candidateId: true, evaluatorNotes: true },
  })

  if (!interview) throw new Error("Interview not found")

  // 2. Fetch all score records for this interview
  const rawScores = await prisma.interviewScore.findMany({
    where: { interviewId },
  })

  if (rawScores.length === 0) throw new Error("Interview has no scores")

  // 3. Fetch the scoring dimensions referenced by those records
  const dimensionIds = [...new Set(rawScores.map((s) => s.dimensionId))]
  const dimensions = await prisma.scoringDimension.findMany({
    where: { id: { in: dimensionIds } },
  })

  const dimMap = new Map(dimensions.map((d) => [d.id, d]))

  // 4. Aggregate scores per dimension (average across evaluators)
  const perDim = new Map<string, { scores: number[]; notes: string[] }>()
  for (const s of rawScores) {
    if (!perDim.has(s.dimensionId)) {
      perDim.set(s.dimensionId, { scores: [], notes: [] })
    }
    const entry = perDim.get(s.dimensionId)!
    entry.scores.push(s.score)
    if (s.notes) entry.notes.push(s.notes)
  }

  // 5. First pass — build per-dimension averages and accumulate weight totals
  type DimAccum = {
    dimensionId: string
    name: string
    avgScore: number
    weight: number
    maxScore: number
    notes: string
  }
  const dimAccums: DimAccum[] = []
  let totalWeight = 0
  let weightedSum = 0

  for (const [dimensionId, { scores, notes }] of perDim) {
    const dim = dimMap.get(dimensionId)
    if (!dim) continue

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const w = dim.weight

    weightedSum += avgScore * w
    totalWeight += w

    dimAccums.push({
      dimensionId,
      name: dim.name,
      avgScore: Math.round(avgScore * 100) / 100,
      weight: w,
      maxScore: dim.maxScore,
      notes: notes.join("; "),
    })
  }

  const overallScore =
    totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 100) / 100
      : 0

  // 6. Second pass — attach weightedContribution to each dimension
  const scoredDimensions: ScoredDimension[] = dimAccums.map((d) => ({
    dimensionId: d.dimensionId,
    name: d.name,
    score: d.avgScore,
    maxScore: d.maxScore,
    notes: d.notes,
    weightedContribution:
      totalWeight > 0
        ? Math.round(((d.avgScore * d.weight) / totalWeight) * 100) / 100
        : 0,
  }))

  // 7. Sort descending by score to identify strengths (top 2) and gaps (bottom 2)
  const sorted = [...scoredDimensions].sort((a, b) => b.score - a.score)
  const strengths = sorted.slice(0, 2).map((d) => d.name)
  const gaps = sorted.slice(-2).map((d) => d.name)

  // 8. AI capability flag
  const aiCapabilityEnabled = dimensions.some((d) => /ai/i.test(d.name))

  return {
    interviewId,
    candidateId: interview.candidateId,
    overallScore,
    dimensions: scoredDimensions,
    verdict: determineVerdict(overallScore),
    strengths,
    gaps,
    summaryNotes: interview.evaluatorNotes ?? "",
    aiCapabilityEnabled,
    generatedAt: new Date().toISOString(),
  }
}
