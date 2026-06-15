import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationConfig: { findFirst: vi.fn() },
    evaluation: { findFirst: vi.fn() },
    user: { update: vi.fn() },
  },
  default: {
    evaluationConfig: { findFirst: vi.fn() },
    evaluation: { findFirst: vi.fn() },
    user: { update: vi.fn() },
  },
}))

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))

import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { getPassingThreshold, evaluateThreshold } from "./threshold-gate"

const mockEvaluationConfig = {
  id: "config-1",
  name: "default",
  passingScore: 60.0,
  isActive: true,
  dimensionWeights: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("getPassingThreshold", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns 60.0 when no config record exists", async () => {
    vi.mocked(prisma.evaluationConfig.findFirst).mockResolvedValue(null)
    const threshold = await getPassingThreshold()
    expect(threshold).toBe(60.0)
  })

  it("returns the passingScore from the active default config", async () => {
    vi.mocked(prisma.evaluationConfig.findFirst).mockResolvedValue({
      ...mockEvaluationConfig,
      passingScore: 75.0,
    })
    const threshold = await getPassingThreshold()
    expect(threshold).toBe(75.0)
  })
})

describe("evaluateThreshold", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.evaluationConfig.findFirst).mockResolvedValue(mockEvaluationConfig)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
  })

  it("returns passed=true when score >= threshold", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue({
      id: "eval-1",
      totalScore: 75.0,
      status: "COMPLETED",
    } as any)

    const result = await evaluateThreshold("user-1")

    expect(result.passed).toBe(true)
    expect(result.score).toBe(75.0)
    expect(result.threshold).toBe(60.0)
  })

  it("returns passed=false when score < threshold", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue({
      id: "eval-1",
      totalScore: 45.0,
      status: "COMPLETED",
    } as any)

    const result = await evaluateThreshold("user-1")

    expect(result.passed).toBe(false)
    expect(result.score).toBe(45.0)
    expect(result.threshold).toBe(60.0)
  })

  it("throws an error when no completed evaluation found", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue(null)

    await expect(evaluateThreshold("user-1")).rejects.toThrow(
      "No completed evaluation found"
    )
  })

  it("updates user status to SHORTLISTED on pass", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue({
      id: "eval-1",
      totalScore: 80.0,
      status: "COMPLETED",
    } as any)

    await evaluateThreshold("user-1")

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { status: "SHORTLISTED" },
    })
  })

  it("updates user status to REJECTED on fail", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue({
      id: "eval-1",
      totalScore: 40.0,
      status: "COMPLETED",
    } as any)

    await evaluateThreshold("user-1")

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { status: "REJECTED" },
    })
  })

  it("calls logAudit with threshold.gate.passed action on pass", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue({
      id: "eval-1",
      totalScore: 70.0,
      status: "COMPLETED",
    } as any)

    await evaluateThreshold("user-1")

    expect(logAudit).toHaveBeenCalledWith(
      "threshold.gate.passed",
      expect.objectContaining({ score: 70.0, threshold: 60.0 }),
      "user-1"
    )
  })

  it("calls logAudit with threshold.gate.failed action on fail", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue({
      id: "eval-1",
      totalScore: 30.0,
      status: "COMPLETED",
    } as any)

    await evaluateThreshold("user-1")

    expect(logAudit).toHaveBeenCalledWith(
      "threshold.gate.failed",
      expect.objectContaining({ score: 30.0, threshold: 60.0 }),
      "user-1"
    )
  })

  it("returns the label from getPerformanceLabel", async () => {
    vi.mocked(prisma.evaluation.findFirst).mockResolvedValue({
      id: "eval-1",
      totalScore: 90.0,
      status: "COMPLETED",
    } as any)

    const result = await evaluateThreshold("user-1")

    expect(result.label).toBe("Excellent")
  })
})
