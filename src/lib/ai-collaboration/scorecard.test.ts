import { vi, describe, it, expect, beforeEach } from "vitest"

// Must be hoisted before module imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    interview: { findUnique: vi.fn() },
    interviewScore: { findMany: vi.fn() },
    scoringDimension: { findMany: vi.fn() },
  },
}))

import { generateScorecard } from "./scorecard"
import { prisma } from "@/lib/prisma"

// ─── Typed mock handles ────────────────────────────────────────────────────────
const mockFindUniqueInterview = vi.mocked(prisma.interview.findUnique)
const mockFindManyScores = vi.mocked(prisma.interviewScore.findMany)
const mockFindManyDimensions = vi.mocked(prisma.scoringDimension.findMany)

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BASE_INTERVIEW = {
  id: "interview-1",
  candidateId: "candidate-1",
  evaluatorNotes: "Solid candidate overall.",
}

/** Four equally-weighted dimensions, no "AI" in any name. */
const BASE_DIMENSIONS = [
  { id: "dim-1", name: "Problem Solving", maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
  { id: "dim-2", name: "Tech Skills",     maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
  { id: "dim-3", name: "Communication",   maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
  { id: "dim-4", name: "Cultural Fit",    maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
]

/** Helper to build raw InterviewScore rows for a given evaluator + score list. */
function makeScores(
  interviewId: string,
  entries: Array<{ dimensionId: string; score: number; notes?: string }>
) {
  return entries.map((e, i) => ({
    id: `score-${i}`,
    interviewId,
    evaluatorId: "evaluator-1",
    dimensionId: e.dimensionId,
    score: e.score,
    notes: e.notes ?? null,
    submittedAt: new Date(),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Error cases ──────────────────────────────────────────────────────────────

describe("generateScorecard — error handling", () => {
  it('throws "Interview not found" when prisma returns null', async () => {
    mockFindUniqueInterview.mockResolvedValue(null)

    await expect(generateScorecard("nonexistent-id")).rejects.toThrow(
      "Interview not found"
    )
  })

  it('throws "Interview has no scores" when no InterviewScore records exist', async () => {
    mockFindUniqueInterview.mockResolvedValue(BASE_INTERVIEW as never)
    mockFindManyScores.mockResolvedValue([] as never)

    await expect(generateScorecard("interview-1")).rejects.toThrow(
      "Interview has no scores"
    )
  })
})

// ─── Weighted overall score ───────────────────────────────────────────────────

describe("generateScorecard — overallScore", () => {
  it("computes a correctly weighted average across dimensions", async () => {
    // dim-1 has double the weight of dim-2
    const weightedDimensions = [
      { id: "dim-1", name: "Problem Solving", maxScore: 100, weight: 2.0, minScore: 0, isActive: true },
      { id: "dim-2", name: "Tech Skills",     maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
    ]
    const scores = makeScores("interview-1", [
      { dimensionId: "dim-1", score: 90 },
      { dimensionId: "dim-2", score: 60 },
    ])
    // weighted avg = (90×2 + 60×1) / (2+1) = 240/3 = 80 (≠ simple avg of 75)
    mockFindUniqueInterview.mockResolvedValue(BASE_INTERVIEW as never)
    mockFindManyScores.mockResolvedValue(scores as never)
    mockFindManyDimensions.mockResolvedValue(weightedDimensions as never)

    const scorecard = await generateScorecard("interview-1")

    expect(scorecard.overallScore).toBeCloseTo(80, 1)
  })
})

// ─── Verdict thresholds ───────────────────────────────────────────────────────

describe("generateScorecard — verdict", () => {
  function setupTwoEqualDims(s1: number, s2: number) {
    const dims = [
      { id: "dim-1", name: "Problem Solving", maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
      { id: "dim-2", name: "Tech Skills",     maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
    ]
    const scores = makeScores("interview-1", [
      { dimensionId: "dim-1", score: s1 },
      { dimensionId: "dim-2", score: s2 },
    ])
    mockFindUniqueInterview.mockResolvedValue(BASE_INTERVIEW as never)
    mockFindManyScores.mockResolvedValue(scores as never)
    mockFindManyDimensions.mockResolvedValue(dims as never)
  }

  it("returns STRONG_HIRE when overallScore >= 85", async () => {
    setupTwoEqualDims(90, 85) // avg = 87.5
    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.verdict).toBe("STRONG_HIRE")
  })

  it("returns HIRE when overallScore is 70–84", async () => {
    setupTwoEqualDims(80, 70) // avg = 75
    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.verdict).toBe("HIRE")
  })

  it("returns BORDERLINE when overallScore is 55–69", async () => {
    setupTwoEqualDims(65, 55) // avg = 60
    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.verdict).toBe("BORDERLINE")
  })

  it("returns NO_HIRE when overallScore < 55", async () => {
    setupTwoEqualDims(50, 40) // avg = 45
    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.verdict).toBe("NO_HIRE")
  })
})

// ─── Strengths and gaps ───────────────────────────────────────────────────────

describe("generateScorecard — strengths and gaps", () => {
  beforeEach(() => {
    const scores = makeScores("interview-1", [
      { dimensionId: "dim-1", score: 90 }, // Problem Solving  — highest
      { dimensionId: "dim-2", score: 80 }, // Tech Skills      — 2nd highest
      { dimensionId: "dim-3", score: 60 }, // Communication    — 2nd lowest
      { dimensionId: "dim-4", score: 50 }, // Cultural Fit     — lowest
    ])
    mockFindUniqueInterview.mockResolvedValue(BASE_INTERVIEW as never)
    mockFindManyScores.mockResolvedValue(scores as never)
    mockFindManyDimensions.mockResolvedValue(BASE_DIMENSIONS as never)
  })

  it("includes the two highest-scored dimension names in strengths", async () => {
    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.strengths).toContain("Problem Solving")
    expect(scorecard.strengths).toContain("Tech Skills")
    expect(scorecard.strengths).toHaveLength(2)
  })

  it("includes the two lowest-scored dimension names in gaps", async () => {
    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.gaps).toContain("Communication")
    expect(scorecard.gaps).toContain("Cultural Fit")
    expect(scorecard.gaps).toHaveLength(2)
  })
})

// ─── AI capability flag ───────────────────────────────────────────────────────

describe("generateScorecard — aiCapabilityEnabled", () => {
  it("is false when no dimension name contains 'AI'", async () => {
    const scores = makeScores("interview-1", [
      { dimensionId: "dim-1", score: 70 },
    ])
    mockFindUniqueInterview.mockResolvedValue(BASE_INTERVIEW as never)
    mockFindManyScores.mockResolvedValue(scores as never)
    mockFindManyDimensions.mockResolvedValue([BASE_DIMENSIONS[0]] as never)

    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.aiCapabilityEnabled).toBe(false)
  })

  it("is true when a dimension name contains 'AI' (case-insensitive)", async () => {
    const dimsWithAI = [
      { id: "dim-1", name: "Problem Solving",   maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
      { id: "dim-ai", name: "AI Collaboration", maxScore: 100, weight: 1.0, minScore: 0, isActive: true },
    ]
    const scores = makeScores("interview-1", [
      { dimensionId: "dim-1",  score: 80 },
      { dimensionId: "dim-ai", score: 70 },
    ])
    mockFindUniqueInterview.mockResolvedValue(BASE_INTERVIEW as never)
    mockFindManyScores.mockResolvedValue(scores as never)
    mockFindManyDimensions.mockResolvedValue(dimsWithAI as never)

    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.aiCapabilityEnabled).toBe(true)
  })
})

// ─── Summary notes ────────────────────────────────────────────────────────────

describe("generateScorecard — summaryNotes", () => {
  it("populates summaryNotes from evaluatorNotes", async () => {
    const scores = makeScores("interview-1", [
      { dimensionId: "dim-1", score: 70 },
    ])
    mockFindUniqueInterview.mockResolvedValue(BASE_INTERVIEW as never)
    mockFindManyScores.mockResolvedValue(scores as never)
    mockFindManyDimensions.mockResolvedValue([BASE_DIMENSIONS[0]] as never)

    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.summaryNotes).toBe(BASE_INTERVIEW.evaluatorNotes)
  })

  it("returns empty string when evaluatorNotes is null", async () => {
    const interviewNoNotes = { ...BASE_INTERVIEW, evaluatorNotes: null }
    const scores = makeScores("interview-1", [
      { dimensionId: "dim-1", score: 70 },
    ])
    mockFindUniqueInterview.mockResolvedValue(interviewNoNotes as never)
    mockFindManyScores.mockResolvedValue(scores as never)
    mockFindManyDimensions.mockResolvedValue([BASE_DIMENSIONS[0]] as never)

    const scorecard = await generateScorecard("interview-1")
    expect(scorecard.summaryNotes).toBe("")
  })
})
