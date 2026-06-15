import { describe, it, expect } from "vitest"
import {
  getDefaultWeights,
  calculateCompositeScore,
  getPerformanceLabel,
  getPerformanceColor,
  formatScoreBreakdown,
  getRubricLevel,
  EVALUATION_DIMENSIONS,
} from "./scoring"

describe("getDefaultWeights", () => {
  it("returns weights that sum to 1.0", () => {
    const weights = getDefaultWeights()
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1.0, 5)
  })

  it("covers all 8 evaluation dimensions", () => {
    const weights = getDefaultWeights()
    expect(Object.keys(weights)).toHaveLength(8)
    for (const dim of EVALUATION_DIMENSIONS) {
      expect(weights).toHaveProperty(dim.key)
    }
  })
})

describe("calculateCompositeScore", () => {
  it("returns 0 when no scores given", () => {
    expect(calculateCompositeScore({})).toBe(0)
  })

  it("returns 100 when all dimensions are 10 with default weights", () => {
    const perfect: Record<string, number> = {}
    for (const dim of EVALUATION_DIMENSIONS) perfect[dim.key] = 10
    expect(calculateCompositeScore(perfect)).toBe(100)
  })

  it("returns 50 when all dimensions are 5", () => {
    const half: Record<string, number> = {}
    for (const dim of EVALUATION_DIMENSIONS) half[dim.key] = 5
    expect(calculateCompositeScore(half)).toBe(50)
  })

  it("normalizes correctly when only a subset of dimensions provided", () => {
    const score = calculateCompositeScore({ executionScore: 10 })
    expect(score).toBe(100)
  })

  it("respects custom weights", () => {
    const customWeights = getDefaultWeights()
    customWeights.executionScore = 1.0
    for (const key of Object.keys(customWeights) as (keyof typeof customWeights)[]) {
      if (key !== "executionScore") customWeights[key] = 0
    }
    const score = calculateCompositeScore({ executionScore: 8 }, customWeights)
    expect(score).toBe(80)
  })
})

describe("getPerformanceLabel", () => {
  it("returns Excellent for score >= 85", () => {
    expect(getPerformanceLabel(85)).toBe("Excellent")
    expect(getPerformanceLabel(100)).toBe("Excellent")
  })

  it("returns Good for score >= 70 and < 85", () => {
    expect(getPerformanceLabel(70)).toBe("Good")
    expect(getPerformanceLabel(84)).toBe("Good")
  })

  it("returns Fair for score >= 50 and < 70", () => {
    expect(getPerformanceLabel(50)).toBe("Fair")
    expect(getPerformanceLabel(69)).toBe("Fair")
  })

  it("returns Poor for score < 50", () => {
    expect(getPerformanceLabel(0)).toBe("Poor")
    expect(getPerformanceLabel(49)).toBe("Poor")
  })
})

describe("getPerformanceColor", () => {
  it("returns green class for Excellent", () => {
    expect(getPerformanceColor(90)).toContain("green")
  })

  it("returns blue class for Good", () => {
    expect(getPerformanceColor(75)).toContain("blue")
  })

  it("returns yellow class for Fair", () => {
    expect(getPerformanceColor(55)).toContain("yellow")
  })

  it("returns red class for Poor", () => {
    expect(getPerformanceColor(40)).toContain("red")
  })
})

describe("formatScoreBreakdown", () => {
  it("returns one entry per dimension", () => {
    const breakdown = formatScoreBreakdown({})
    expect(breakdown).toHaveLength(EVALUATION_DIMENSIONS.length)
  })

  it("populates weightedContribution when score provided", () => {
    const breakdown = formatScoreBreakdown({ executionScore: 10 })
    const exec = breakdown.find((b) => b.key === "executionScore")!
    expect(exec.weightedContribution).toBeGreaterThan(0)
    expect(exec.score).toBe(10)
  })

  it("sets weightedContribution to 0 for missing dimensions", () => {
    const breakdown = formatScoreBreakdown({})
    for (const item of breakdown) {
      expect(item.weightedContribution).toBe(0)
      expect(item.score).toBeNull()
    }
  })
})

describe("getRubricLevel", () => {
  it("returns null for unknown dimension", () => {
    expect(getRubricLevel("unknownDimension", 5)).toBeNull()
  })

  it("returns correct level for score in range", () => {
    const level = getRubricLevel("executionScore", 2)
    expect(level?.label).toBe("Poor")
  })

  it("returns Excellent level for score 9-10", () => {
    expect(getRubricLevel("executionScore", 9)?.label).toBe("Excellent")
    expect(getRubricLevel("executionScore", 10)?.label).toBe("Excellent")
  })
})
