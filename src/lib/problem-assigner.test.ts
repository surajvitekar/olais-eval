import { vi, describe, it, expect, beforeEach } from "vitest"

// problem-assigner.ts uses `import prisma from "@/lib/prisma"` (default export).
// We share one object so that both the named export (used in tests) and the
// default export (used inside assignProblems) reference the same mock.
vi.mock("@/lib/prisma", () => {
  const mock = {
    skillProfile: { findFirst: vi.fn() },
    problemTemplate: { findMany: vi.fn() },
  }
  return { prisma: mock, default: mock }
})

import { prisma } from "@/lib/prisma"
import { assignProblems } from "./problem-assigner"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfile(overrides: { topSkills?: string[] } = {}) {
  return {
    id: "profile-1",
    userId: "user-1",
    topSkills: overrides.topSkills ?? ["FRONTEND"],
    generatedAt: new Date(),
  }
}

function makeProblems(count: number, groupPrefix = "group") {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    category: i % 2 === 0 ? "frontend" : "full-stack",
    variantGroup: `${groupPrefix}${String.fromCharCode(65 + i)}`, // groupA, groupB, …
    difficulty: "MEDIUM",
  }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("assignProblems", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // -------------------------------------------------------------------------
  // 1. No skill profile
  // -------------------------------------------------------------------------

  it("throws when candidate has no skill profile", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(null)

    await expect(assignProblems("user-1")).rejects.toThrow(
      "No skill profile found. Complete the assessment first."
    )
  })

  // -------------------------------------------------------------------------
  // 2. Empty topSkills
  // -------------------------------------------------------------------------

  it("throws when skill profile has no top skills", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: [] }) as any
    )

    await expect(assignProblems("user-1")).rejects.toThrow(
      "No skills identified in profile."
    )
  })

  // -------------------------------------------------------------------------
  // 3. Skill-to-category mapping (uses the candidate's profile)
  // -------------------------------------------------------------------------

  it("queries problems in categories matching the candidate's FRONTEND skill", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["FRONTEND"] }) as any
    )
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(
      makeProblems(2) as any
    )

    await assignProblems("user-1")

    expect(prisma.problemTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          category: { in: expect.arrayContaining(["frontend", "full-stack"]) },
        }),
      })
    )
  })

  it("queries problems in categories matching the candidate's PYTHON skill", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["PYTHON"] }) as any
    )
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(
      makeProblems(2) as any
    )

    await assignProblems("user-python")

    expect(prisma.problemTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { in: expect.arrayContaining(["automation", "data"]) },
        }),
      })
    )
  })

  // -------------------------------------------------------------------------
  // 4. isActive filter is always applied
  // -------------------------------------------------------------------------

  it("always queries with isActive: true (inactive problems are excluded by the DB query)", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["BACKEND"] }) as any
    )
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(
      makeProblems(1) as any
    )

    await assignProblems("user-1")

    expect(prisma.problemTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    )
  })

  // -------------------------------------------------------------------------
  // 5. Returns at most 2 problems (default count)
  // -------------------------------------------------------------------------

  it("returns at most 2 problems when many are available", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["FRONTEND", "BACKEND"] }) as any
    )
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(
      makeProblems(10) as any
    )

    const result = await assignProblems("user-1")

    expect(result.length).toBeLessThanOrEqual(2)
  })

  it("returns 1 problem when only 1 is available", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["FRONTEND"] }) as any
    )
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(
      makeProblems(1) as any
    )

    const result = await assignProblems("user-1")

    expect(result).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // 6. Returns empty array when no active problems exist at all (fallback path)
  // -------------------------------------------------------------------------

  it("returns empty array when no problems exist even in fallback", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["FRONTEND"] }) as any
    )
    // First call: matching categories → empty; second call: all problems fallback → empty
    vi.mocked(prisma.problemTemplate.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await assignProblems("user-1")

    expect(result).toEqual([])
  })

  // -------------------------------------------------------------------------
  // 7. Falls back to all active problems when skill doesn't map to any category
  // -------------------------------------------------------------------------

  it("falls back to all active problems when the skill doesn't map to any category", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["UNKNOWN_SKILL"] }) as any
    )
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(
      makeProblems(2) as any
    )

    const result = await assignProblems("user-1")

    // Fallback query has no category filter — only isActive: true
    expect(prisma.problemTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
    expect(result.length).toBeGreaterThan(0)
  })

  it("falls back when matched-category query returns no problems", async () => {
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["AI_ML"] }) as any
    )
    // Matched-category query returns nothing; fallback returns two problems
    vi.mocked(prisma.problemTemplate.findMany)
      .mockResolvedValueOnce([]) // category-scoped query
      .mockResolvedValueOnce(makeProblems(2) as any) // fallback

    const result = await assignProblems("user-1")

    expect(prisma.problemTemplate.findMany).toHaveBeenCalledTimes(2)
    expect(result.length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------------------
  // 8. Determinism — same userId always produces the same pick
  // -------------------------------------------------------------------------

  it("produces the same assignment for the same userId (deterministic)", async () => {
    const profile = makeProfile({ topSkills: ["FRONTEND"] })
    const problems = makeProblems(5)

    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(profile as any)
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(problems as any)
    const result1 = await assignProblems("user-deterministic")

    vi.resetAllMocks()

    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(profile as any)
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(problems as any)
    const result2 = await assignProblems("user-deterministic")

    expect(result1.map((p) => p.id)).toEqual(result2.map((p) => p.id))
  })

  it("produces different assignments for different userIds (non-trivially)", async () => {
    const profile = makeProfile({ topSkills: ["FRONTEND"] })
    const problems = makeProblems(6)

    // Collect picks for many user IDs; at least some should differ
    const picks = new Set<string>()
    for (const uid of ["a", "b", "c", "d", "e", "f"]) {
      vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(profile as any)
      vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(problems as any)
      const result = await assignProblems(uid)
      picks.add(result.map((p) => p.id).join(","))
      vi.resetAllMocks()
    }

    // With 6 users and 6 problems in different groups we expect at least 2 distinct pick sets
    expect(picks.size).toBeGreaterThan(1)
  })

  // -------------------------------------------------------------------------
  // 9. Multiple top skills are all considered
  // -------------------------------------------------------------------------

  it("combines categories from all top skills (up to 3)", async () => {
    // FRONTEND → frontend, full-stack
    // PYTHON   → automation, data
    vi.mocked(prisma.skillProfile.findFirst).mockResolvedValue(
      makeProfile({ topSkills: ["FRONTEND", "PYTHON"] }) as any
    )
    vi.mocked(prisma.problemTemplate.findMany).mockResolvedValue(
      makeProblems(2) as any
    )

    await assignProblems("user-multi")

    const callArg = vi.mocked(prisma.problemTemplate.findMany).mock.calls[0][0]
    const categories: string[] = (callArg as any).where.category.in
    expect(categories).toEqual(expect.arrayContaining(["frontend", "full-stack", "automation", "data"]))
  })
})
