import { describe, it, expect } from "vitest"
import {
  getLevelForXP,
  getXPProgress,
  calculateXP,
  computeBadges,
  computeRankChange,
} from "./gamification"

// ── getLevelForXP ─────────────────────────────────────────────────────────────

describe("getLevelForXP", () => {
  it("returns level 1 at 0 XP (Getting Started, bronze_iii)", () => {
    const info = getLevelForXP(0)
    expect(info.level).toBe(1)
    expect(info.name).toBe("Getting Started")
    expect(info.tier).toBe("bronze_iii")
  })

  it("remains at level 1 just below the 500 XP threshold", () => {
    expect(getLevelForXP(499).level).toBe(1)
  })

  it("returns level 2 at exactly 500 XP (Apprentice)", () => {
    const info = getLevelForXP(500)
    expect(info.level).toBe(2)
    expect(info.name).toBe("Apprentice")
    expect(info.tier).toBe("bronze_ii")
  })

  it("returns level 3 at 1500 XP (Developer)", () => {
    const info = getLevelForXP(1500)
    expect(info.level).toBe(3)
    expect(info.name).toBe("Developer")
    expect(info.tier).toBe("bronze_i")
  })

  it("returns level 4 at 3000 XP (Engineer)", () => {
    const info = getLevelForXP(3000)
    expect(info.level).toBe(4)
    expect(info.name).toBe("Engineer")
    expect(info.tier).toBe("silver_ii")
  })

  it("returns level 5 at 5000 XP (Senior)", () => {
    const info = getLevelForXP(5000)
    expect(info.level).toBe(5)
    expect(info.name).toBe("Senior")
  })

  it("returns level 6 at 8000 XP (Expert)", () => {
    const info = getLevelForXP(8000)
    expect(info.level).toBe(6)
    expect(info.name).toBe("Expert")
    expect(info.tier).toBe("gold_ii")
  })

  it("returns level 7 at 12000 XP (Master, gold_i — max level)", () => {
    const info = getLevelForXP(12000)
    expect(info.level).toBe(7)
    expect(info.name).toBe("Master")
    expect(info.tier).toBe("gold_i")
  })

  it("stays at max level 7 for XP well beyond 12000", () => {
    expect(getLevelForXP(99999).level).toBe(7)
    expect(getLevelForXP(12001).level).toBe(7)
  })

  it("returns correct emoji and color for each level", () => {
    expect(getLevelForXP(0).emoji).toBe("🥉")
    expect(getLevelForXP(500).emoji).toBe("🥈")
    expect(getLevelForXP(12000).emoji).toBe("👑")
    expect(getLevelForXP(12000).color).toBe("yellow-300")
  })
})

// ── getXPProgress ─────────────────────────────────────────────────────────────

describe("getXPProgress", () => {
  it("returns percent=0, remaining=500 at 0 XP (start of level 1)", () => {
    const p = getXPProgress(0)
    expect(p.current).toBe(0)
    expect(p.nextLevel).toBe(500)
    expect(p.percent).toBe(0)
    expect(p.remaining).toBe(500)
  })

  it("returns 50% progress at 250 XP (midpoint of level 1 → level 2)", () => {
    const p = getXPProgress(250)
    expect(p.percent).toBe(50)
    expect(p.remaining).toBe(250)
    expect(p.nextLevel).toBe(500)
  })

  it("correctly tracks progress mid-tier for level 2 (500–1500 range)", () => {
    // At 1000 XP: midpoint of 500–1500, so 50%
    const p = getXPProgress(1000)
    expect(p.percent).toBe(50)
    expect(p.nextLevel).toBe(1500)
    expect(p.remaining).toBe(500)
  })

  it("returns percent=100 and remaining=0 at max level (12000 XP)", () => {
    const p = getXPProgress(12000)
    expect(p.percent).toBe(100)
    expect(p.remaining).toBe(0)
    expect(p.nextLevel).toBe(12000) // nextLevel equals current at max
  })

  it("stays at 100% for XP beyond the max level threshold", () => {
    const p = getXPProgress(20000)
    expect(p.percent).toBe(100)
    expect(p.remaining).toBe(0)
  })
})

// ── calculateXP ───────────────────────────────────────────────────────────────

describe("calculateXP", () => {
  it("returns 0 XP for 0 submissions with no score or time", () => {
    expect(calculateXP({ submissionCount: 0 })).toBe(0)
  })

  it("awards 100 XP per submission (base rate)", () => {
    expect(calculateXP({ submissionCount: 3 })).toBe(300)
  })

  it("adds evaluationScore × 10 as score-based XP", () => {
    const xp = calculateXP({ submissionCount: 1, evaluationScore: 80 })
    expect(xp).toBe(100 + 800) // 900
  })

  it("adds 50 XP speed bonus when fastestTime < 3600 seconds", () => {
    const xp = calculateXP({ submissionCount: 1, fastestTime: 3599 })
    expect(xp).toBe(100 + 50)
  })

  it("does NOT add speed bonus when fastestTime is exactly 3600", () => {
    const xp = calculateXP({ submissionCount: 1, fastestTime: 3600 })
    expect(xp).toBe(100) // no bonus at the threshold
  })

  it("does NOT add speed bonus when fastestTime is null", () => {
    expect(calculateXP({ submissionCount: 1, fastestTime: null })).toBe(100)
  })

  it("does NOT add score XP when evaluationScore is null", () => {
    expect(calculateXP({ submissionCount: 1, evaluationScore: null })).toBe(100)
  })

  it("combines all XP sources correctly", () => {
    // 2 submissions × 100 + 90 × 10 + 50 speed bonus (1800 < 3600)
    const xp = calculateXP({ submissionCount: 2, evaluationScore: 90, fastestTime: 1800 })
    expect(xp).toBe(200 + 900 + 50) // 1150
  })

  it("awards speed bonus even for a very fast time (fastestTime=1)", () => {
    const xp = calculateXP({ submissionCount: 1, fastestTime: 1 })
    expect(xp).toBe(150)
  })
})

// ── computeBadges ─────────────────────────────────────────────────────────────

describe("computeBadges", () => {
  const base = { submissionCount: 0, status: "active" }

  it("returns no badges for 0 submissions", () => {
    expect(computeBadges(base)).toHaveLength(0)
  })

  it("awards first_submission badge when submissionCount >= 1", () => {
    const badges = computeBadges({ ...base, submissionCount: 1 })
    expect(badges.some((b) => b.slug === "first_submission")).toBe(true)
  })

  it("first_submission badge has correct name and emoji", () => {
    const badges = computeBadges({ ...base, submissionCount: 1 })
    const badge = badges.find((b) => b.slug === "first_submission")!
    expect(badge.name).toBe("First Submission")
    expect(badge.emoji).toBe("🚀")
  })

  it("awards consistent badge when submissionCount >= 2", () => {
    const badges = computeBadges({ ...base, submissionCount: 2 })
    expect(badges.some((b) => b.slug === "consistent")).toBe(true)
    // first_submission also present
    expect(badges.some((b) => b.slug === "first_submission")).toBe(true)
  })

  it("awards overachiever badge when submissionCount >= 3", () => {
    const badges = computeBadges({ ...base, submissionCount: 3 })
    expect(badges.some((b) => b.slug === "overachiever")).toBe(true)
  })

  it("does NOT award consistent or overachiever for 1 submission", () => {
    const badges = computeBadges({ ...base, submissionCount: 1 })
    expect(badges.some((b) => b.slug === "consistent")).toBe(false)
    expect(badges.some((b) => b.slug === "overachiever")).toBe(false)
  })

  it("awards speed_demon when fastestTime < 1800 seconds", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, fastestTime: 1799 })
    expect(badges.some((b) => b.slug === "speed_demon")).toBe(true)
  })

  it("does NOT award speed_demon when fastestTime = 1800 (threshold is strictly < 1800)", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, fastestTime: 1800 })
    expect(badges.some((b) => b.slug === "speed_demon")).toBe(false)
  })

  it("does NOT award speed_demon when fastestTime is null", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, fastestTime: null })
    expect(badges.some((b) => b.slug === "speed_demon")).toBe(false)
  })

  it("awards perfect_score when evaluationScore >= 90", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, evaluationScore: 90 })
    expect(badges.some((b) => b.slug === "perfect_score")).toBe(true)
  })

  it("does NOT award perfect_score when evaluationScore = 89", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, evaluationScore: 89 })
    expect(badges.some((b) => b.slug === "perfect_score")).toBe(false)
  })

  it("does NOT award perfect_score when evaluationScore is null", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, evaluationScore: null })
    expect(badges.some((b) => b.slug === "perfect_score")).toBe(false)
  })

  it("awards top_performer when rank <= 3", () => {
    expect(computeBadges({ ...base, submissionCount: 1, rank: 1 }).some((b) => b.slug === "top_performer")).toBe(true)
    expect(computeBadges({ ...base, submissionCount: 1, rank: 2 }).some((b) => b.slug === "top_performer")).toBe(true)
    expect(computeBadges({ ...base, submissionCount: 1, rank: 3 }).some((b) => b.slug === "top_performer")).toBe(true)
  })

  it("does NOT award top_performer when rank = 4", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, rank: 4 })
    expect(badges.some((b) => b.slug === "top_performer")).toBe(false)
  })

  it("does NOT award top_performer when rank is undefined", () => {
    const badges = computeBadges({ ...base, submissionCount: 1 })
    expect(badges.some((b) => b.slug === "top_performer")).toBe(false)
  })

  it("awards interview_ready for UNDER_REVIEW status", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, status: "UNDER_REVIEW" })
    expect(badges.some((b) => b.slug === "interview_ready")).toBe(true)
  })

  it("awards interview_ready for SHORTLISTED status", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, status: "SHORTLISTED" })
    expect(badges.some((b) => b.slug === "interview_ready")).toBe(true)
  })

  it("awards interview_ready for SELECTED status", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, status: "SELECTED" })
    expect(badges.some((b) => b.slug === "interview_ready")).toBe(true)
  })

  it("does NOT award interview_ready for generic active status", () => {
    const badges = computeBadges({ ...base, submissionCount: 1, status: "active" })
    expect(badges.some((b) => b.slug === "interview_ready")).toBe(false)
  })

  it("accumulates all applicable badges simultaneously", () => {
    const badges = computeBadges({
      submissionCount: 3,
      evaluationScore: 95,
      fastestTime: 900,
      status: "SHORTLISTED",
      rank: 2,
    })
    const slugs = badges.map((b) => b.slug)
    expect(slugs).toContain("first_submission")
    expect(slugs).toContain("consistent")
    expect(slugs).toContain("overachiever")
    expect(slugs).toContain("speed_demon")
    expect(slugs).toContain("perfect_score")
    expect(slugs).toContain("top_performer")
    expect(slugs).toContain("interview_ready")
  })
})

// ── computeRankChange ─────────────────────────────────────────────────────────

describe("computeRankChange", () => {
  it("returns type=new when previousRank is null", () => {
    expect(computeRankChange(1, null)).toEqual({ type: "new", amount: 0 })
  })

  it("returns type=new when previousRank is undefined", () => {
    expect(computeRankChange(1, undefined)).toEqual({ type: "new", amount: 0 })
  })

  it("returns type=up with correct amount when rank improved", () => {
    expect(computeRankChange(2, 5)).toEqual({ type: "up", amount: 3 })
  })

  it("returns type=up when jumping to rank 1 from rank 10", () => {
    expect(computeRankChange(1, 10)).toEqual({ type: "up", amount: 9 })
  })

  it("returns type=down with correct amount when rank dropped", () => {
    expect(computeRankChange(5, 2)).toEqual({ type: "down", amount: 3 })
  })

  it("returns type=same with amount=0 when rank is unchanged", () => {
    expect(computeRankChange(3, 3)).toEqual({ type: "same", amount: 0 })
  })

  it("handles a one-position improvement correctly", () => {
    expect(computeRankChange(4, 5)).toEqual({ type: "up", amount: 1 })
  })

  it("handles a one-position drop correctly", () => {
    expect(computeRankChange(2, 1)).toEqual({ type: "down", amount: 1 })
  })
})
