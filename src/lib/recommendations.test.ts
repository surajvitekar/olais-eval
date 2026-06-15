import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: { findFirst: vi.fn() },
    interview: { findFirst: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import { generateRecommendation } from "./recommendations"

const mockEvalFindFirst = vi.mocked(prisma.evaluation.findFirst)
const mockInterviewFindFirst = vi.mocked(prisma.interview.findFirst)

describe("generateRecommendation", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns HIRE when combined score >= 70", async () => {
    // combined = 80*0.6 + 70*0.4 = 48 + 28 = 76
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 80 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 70 } as any)

    const result = await generateRecommendation("user-hire")
    expect(result.verdict).toBe("HIRE")
    expect(result.combinedScore).toBe(76)
  })

  it("returns REJECT when combined score < 55", async () => {
    // combined = 50*0.6 + 40*0.4 = 30 + 16 = 46
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 50 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 40 } as any)

    const result = await generateRecommendation("user-reject")
    expect(result.verdict).toBe("REJECT")
    expect(result.combinedScore).toBe(46)
  })

  it("returns BORDERLINE when combined score is between 55 and 69", async () => {
    // combined = 60*0.6 + 65*0.4 = 36 + 26 = 62
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 60 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 65 } as any)

    const result = await generateRecommendation("user-borderline")
    expect(result.verdict).toBe("BORDERLINE")
    expect(result.combinedScore).toBe(62)
  })

  it("uses eval-only scoring (weight 1.0) when no interview exists", async () => {
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 75 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce(null)

    const result = await generateRecommendation("user-eval-only")
    expect(result.verdict).toBe("HIRE")
    expect(result.combinedScore).toBe(75)
    expect(result.evaluationScore).toBe(75)
    expect(result.interviewScore).toBeNull()
    expect(result.breakdown.hasInterview).toBe(false)
  })

  it("uses interview-only scoring when no evaluation exists", async () => {
    mockEvalFindFirst.mockResolvedValueOnce(null)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 80 } as any)

    const result = await generateRecommendation("user-interview-only")
    expect(result.verdict).toBe("HIRE")
    expect(result.combinedScore).toBe(80)
    expect(result.evaluationScore).toBeNull()
    expect(result.interviewScore).toBe(80)
    expect(result.breakdown.hasInterview).toBe(true)
  })

  it("returns confidence HIGH when both scores are present", async () => {
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 80 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 70 } as any)

    const result = await generateRecommendation("user-both")
    expect(result.confidence).toBe("HIGH")
  })

  it("returns confidence MEDIUM when only evaluation score is present", async () => {
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 75 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce(null)

    const result = await generateRecommendation("user-eval-only-conf")
    expect(result.confidence).toBe("MEDIUM")
  })

  it("returns confidence MEDIUM when only interview score is present", async () => {
    mockEvalFindFirst.mockResolvedValueOnce(null)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 80 } as any)

    const result = await generateRecommendation("user-interview-only-conf")
    expect(result.confidence).toBe("MEDIUM")
  })

  it("returns confidence LOW and verdict REJECT when no scores are available", async () => {
    mockEvalFindFirst.mockResolvedValueOnce(null)
    mockInterviewFindFirst.mockResolvedValueOnce(null)

    const result = await generateRecommendation("user-no-data")
    expect(result.confidence).toBe("LOW")
    expect(result.verdict).toBe("REJECT")
  })

  it("returns non-empty reasoning string in all cases", async () => {
    // HIRE + both scores
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 80 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 70 } as any)
    let result = await generateRecommendation("user-reasoning-hire")
    expect(result.reasoning).toBeTruthy()
    expect(result.reasoning.length).toBeGreaterThan(0)

    // REJECT + both scores
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 30 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 30 } as any)
    result = await generateRecommendation("user-reasoning-reject")
    expect(result.reasoning).toBeTruthy()
    expect(result.reasoning.length).toBeGreaterThan(0)

    // LOW confidence (no data)
    mockEvalFindFirst.mockResolvedValueOnce(null)
    mockInterviewFindFirst.mockResolvedValueOnce(null)
    result = await generateRecommendation("user-reasoning-low")
    expect(result.reasoning).toBeTruthy()
    expect(result.reasoning.length).toBeGreaterThan(0)

    // Eval-only
    mockEvalFindFirst.mockResolvedValueOnce({ totalScore: 60 } as any)
    mockInterviewFindFirst.mockResolvedValueOnce(null)
    result = await generateRecommendation("user-reasoning-eval")
    expect(result.reasoning).toBeTruthy()
    expect(result.reasoning.length).toBeGreaterThan(0)

    // Interview-only
    mockEvalFindFirst.mockResolvedValueOnce(null)
    mockInterviewFindFirst.mockResolvedValueOnce({ overallScore: 60 } as any)
    result = await generateRecommendation("user-reasoning-interview")
    expect(result.reasoning).toBeTruthy()
    expect(result.reasoning.length).toBeGreaterThan(0)
  })
})
