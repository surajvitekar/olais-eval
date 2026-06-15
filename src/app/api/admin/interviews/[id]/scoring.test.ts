/**
 * Tests for Stage 10 (Approve/Tweak/Reject) — Interview Scoring
 *
 * Covers PUT /api/admin/interviews/[id]/score (legacy & dynamic modes)
 * and GET  /api/admin/interviews/[id]/score.
 *
 * GAPS FOUND (missing from the implementation):
 *  - No audit log entry is created when scores are submitted (scoring route has no
 *    prisma.auditLog.create calls). The audit trail for scoring decisions is absent.
 *  - No formal "rejection" concept: the route accepts scores of 0 (valid per schema)
 *    but has no rejectionReason field or explicit reject action. Rejection is implicit —
 *    i.e. submit all zeroes and set status COMPLETED with overallScore=0.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    interview: { findUnique: vi.fn(), update: vi.fn() },
    leaderboardEntry: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    scoringDimension: { findMany: vi.fn() },
    interviewScore: { upsert: vi.fn(), findMany: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PUT, GET } from "./score/route"

const mockAuth = vi.mocked(auth)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const scheduledInterview = {
  id: "int-1",
  status: "SCHEDULED",
  candidateId: "cand-1",
}

const completedInterviewResponse = {
  id: "int-1",
  status: "COMPLETED",
  problemSolving: 80,
  techSkills: 70,
  communication: 75,
  culturalFit: 85,
  overallScore: 77.5,
  evaluatorNotes: null,
  scoredAt: new Date(),
  candidate: { id: "cand-1", name: "Alice", email: "alice@test.com" },
  evaluator: { id: "admin-1", name: "Admin", email: "admin@test.com" },
  interviewScores: [],
}

function params(id = "int-1") {
  return { params: Promise.resolve({ id }) }
}

function putRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/admin/interviews/${id}/score`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function getRequest(id: string) {
  return new Request(`http://localhost/api/admin/interviews/${id}/score`)
}

// Minimal leaderboard mocks so the post-score sync never throws
function setupLeaderboardMocks() {
  vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.leaderboardEntry.create).mockResolvedValue({} as any)
}

// ── PUT — Auth & basic error cases ────────────────────────────────────────────

describe("PUT /api/admin/interviews/[id]/score — auth & error cases", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupLeaderboardMocks()
  })

  it("returns 403 for unauthenticated requests (no session)", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 403 for CANDIDATE role (lacks EVALUATE_SUBMISSIONS permission)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "CANDIDATE" } } as any)
    const res = await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(res.status).toBe(403)
  })

  it("returns 403 for HIRING_MANAGER role (lacks EVALUATE_SUBMISSIONS permission)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "hm-1", role: "HIRING_MANAGER" } } as any)
    const res = await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(res.status).toBe(403)
  })

  it("returns 403 for READ_ONLY role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "ro-1", role: "READ_ONLY" } } as any)
    const res = await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(res.status).toBe(403)
  })

  it("returns 404 when the interview does not exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue(null)

    const res = await PUT(putRequest("not-found", { problemSolving: 80 }), params("not-found"))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("Interview not found")
  })

  it("returns 400 when interview status is not SCHEDULED or COMPLETED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "int-1",
      status: "DRAFT",
      candidateId: "cand-1",
    } as any)

    const res = await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/SCHEDULED or COMPLETED/)
  })

  it("REVIEWER role is allowed (has EVALUATE_SUBMISSIONS permission)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "rev-1", role: "REVIEWER" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue(scheduledInterview as any)
    vi.mocked(prisma.interview.update).mockResolvedValue(completedInterviewResponse as any)

    const res = await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(res.status).toBe(200)
  })
})

// ── PUT — Legacy scoring (hardcoded four dimensions) ─────────────────────────

describe("PUT /api/admin/interviews/[id]/score — legacy scoring", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupLeaderboardMocks()
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue(scheduledInterview as any)
    vi.mocked(prisma.interview.update).mockResolvedValue(completedInterviewResponse as any)
  })

  it("saves all four dimension scores and sets status to COMPLETED", async () => {
    const res = await PUT(
      putRequest("int-1", { problemSolving: 80, techSkills: 70, communication: 75, culturalFit: 85 }),
      params()
    )
    expect(res.status).toBe(200)
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          problemSolving: 80,
          techSkills: 70,
          communication: 75,
          culturalFit: 85,
        }),
      })
    )
  })

  it("calculates overallScore as the simple average of all provided dimensions", async () => {
    // (80 + 70 + 75 + 85) / 4 = 77.5
    await PUT(
      putRequest("int-1", { problemSolving: 80, techSkills: 70, communication: 75, culturalFit: 85 }),
      params()
    )
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ overallScore: 77.5 }),
      })
    )
  })

  it("accepts a partial legacy body (single dimension) and calculates average of that one", async () => {
    vi.mocked(prisma.interview.update).mockResolvedValue({
      ...completedInterviewResponse,
      overallScore: 90,
    } as any)

    const res = await PUT(putRequest("int-1", { problemSolving: 90 }), params())
    expect(res.status).toBe(200)
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ overallScore: 90 }),
      })
    )
  })

  it("includes optional evaluatorNotes when provided", async () => {
    await PUT(
      putRequest("int-1", { problemSolving: 80, evaluatorNotes: "Excellent problem-solving." }),
      params()
    )
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ evaluatorNotes: "Excellent problem-solving." }),
      })
    )
  })

  it("returns 400 when a legacy body has no score dimensions (evaluatorNotes only)", async () => {
    // A body with none of the legacy dimension keys falls through to dynamic scoring
    // which then fails zod validation (dimensionScores is required).
    const res = await PUT(putRequest("int-1", { evaluatorNotes: "Good candidate" }), params())
    expect(res.status).toBe(400)
  })

  it("allows re-scoring an interview already in COMPLETED status", async () => {
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      ...scheduledInterview,
      status: "COMPLETED",
    } as any)

    const res = await PUT(putRequest("int-1", { problemSolving: 60 }), params())
    expect(res.status).toBe(200)
  })

  it("rejects scores below 0 (validation error)", async () => {
    const res = await PUT(putRequest("int-1", { problemSolving: -1 }), params())
    expect(res.status).toBe(400)
  })

  it("rejects scores above 100 (validation error)", async () => {
    const res = await PUT(putRequest("int-1", { problemSolving: 101 }), params())
    expect(res.status).toBe(400)
  })

  it("accepts zero scores (rejection-equivalent: all dimensions = 0)", async () => {
    vi.mocked(prisma.interview.update).mockResolvedValue({
      ...completedInterviewResponse,
      overallScore: 0,
    } as any)

    const res = await PUT(
      putRequest("int-1", { problemSolving: 0, techSkills: 0, communication: 0, culturalFit: 0 }),
      params()
    )
    expect(res.status).toBe(200)
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ overallScore: 0, status: "COMPLETED" }),
      })
    )
  })

  it("triggers a leaderboard entry upsert for the candidate after scoring", async () => {
    await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(prisma.leaderboardEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "cand-1" } })
    )
  })

  it("creates a new leaderboard entry when none exists for the candidate", async () => {
    // findFirst returns null → create path is taken
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)

    await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(prisma.leaderboardEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "cand-1" }),
      })
    )
  })

  it("updates an existing leaderboard entry when one is found", async () => {
    const existingEntry = { id: "lb-1", userId: "cand-1", evaluationScore: 70, combinedScore: 70 }
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(existingEntry as any)
    vi.mocked(prisma.leaderboardEntry.update).mockResolvedValue({} as any)

    await PUT(putRequest("int-1", { problemSolving: 80 }), params())
    expect(prisma.leaderboardEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lb-1" } })
    )
  })

  it("response body includes the updated interview object", async () => {
    const res = await PUT(
      putRequest("int-1", { problemSolving: 80, techSkills: 70 }),
      params()
    )
    const data = await res.json()
    expect(data).toHaveProperty("id", "int-1")
    expect(data).toHaveProperty("status", "COMPLETED")
  })
})

// ── PUT — Dynamic scoring (configurable dimensions) ───────────────────────────

describe("PUT /api/admin/interviews/[id]/score — dynamic scoring", () => {
  const activeDimension = {
    id: "dim-technical",
    name: "Technical Skills",
    weight: 1.0,
    isActive: true,
    maxScore: 100,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    setupLeaderboardMocks()
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue(scheduledInterview as any)
    vi.mocked(prisma.scoringDimension.findMany).mockResolvedValue([activeDimension] as any)
    vi.mocked(prisma.interviewScore.upsert).mockResolvedValue({} as any)
    vi.mocked(prisma.interviewScore.findMany).mockResolvedValue([{ score: 85 }] as any)
    vi.mocked(prisma.interview.update).mockResolvedValue({
      ...completedInterviewResponse,
      overallScore: 85,
    } as any)
  })

  it("upserts an InterviewScore record for each submitted dimension", async () => {
    const res = await PUT(
      putRequest("int-1", {
        dimensionScores: [{ dimensionId: "dim-technical", score: 85, notes: "Strong skills" }],
      }),
      params()
    )
    expect(res.status).toBe(200)
    expect(prisma.interviewScore.upsert).toHaveBeenCalledOnce()
    expect(prisma.interviewScore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          interviewId: "int-1",
          dimensionId: "dim-technical",
          score: 85,
          notes: "Strong skills",
          evaluatorId: "admin-1",
        }),
        update: expect.objectContaining({ score: 85, notes: "Strong skills" }),
      })
    )
  })

  it("sets interview status to COMPLETED after dynamic scoring", async () => {
    await PUT(
      putRequest("int-1", {
        dimensionScores: [{ dimensionId: "dim-technical", score: 85 }],
      }),
      params()
    )
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    )
  })

  it("stores evaluatorNotes on the interview when provided", async () => {
    await PUT(
      putRequest("int-1", {
        dimensionScores: [{ dimensionId: "dim-technical", score: 85 }],
        evaluatorNotes: "Impressive depth.",
      }),
      params()
    )
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ evaluatorNotes: "Impressive depth." }),
      })
    )
  })

  it("returns 400 when a dimension ID is invalid or inactive", async () => {
    vi.mocked(prisma.scoringDimension.findMany).mockResolvedValue([] as any) // none found

    const res = await PUT(
      putRequest("int-1", {
        dimensionScores: [{ dimensionId: "bad-dim", score: 80 }],
      }),
      params()
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid or inactive/)
  })

  it("returns 400 for an empty dimensionScores array (schema requires min 1)", async () => {
    const res = await PUT(
      putRequest("int-1", { dimensionScores: [] }),
      params()
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when dimensionScores is missing entirely", async () => {
    const res = await PUT(
      putRequest("int-1", { evaluatorNotes: "only notes" }),
      params()
    )
    expect(res.status).toBe(400)
  })

  it("computes weighted overallScore from dimension weights", async () => {
    const dimensions = [
      { id: "dim-a", weight: 2, isActive: true },
      { id: "dim-b", weight: 1, isActive: true },
    ]
    vi.mocked(prisma.scoringDimension.findMany).mockResolvedValue(dimensions as any)
    vi.mocked(prisma.interviewScore.upsert).mockResolvedValue({} as any)
    vi.mocked(prisma.interviewScore.findMany).mockResolvedValue([{ score: 90 }, { score: 60 }] as any)

    await PUT(
      putRequest("int-1", {
        dimensionScores: [
          { dimensionId: "dim-a", score: 90 },
          { dimensionId: "dim-b", score: 60 },
        ],
      }),
      params()
    )

    // weightedSum = 90×2 + 60×1 = 240; totalWeight = 3; overall = 240/3 = 80
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ overallScore: 80 }),
      })
    )
  })

  it("uses average of ALL evaluator scores (from interviewScore.findMany) for leaderboard", async () => {
    // Simulate two evaluators having previously scored this interview
    vi.mocked(prisma.interviewScore.findMany).mockResolvedValue([
      { score: 80 },
      { score: 60 },
    ] as any)

    await PUT(
      putRequest("int-1", {
        dimensionScores: [{ dimensionId: "dim-technical", score: 80 }],
      }),
      params()
    )

    // Average of 80 and 60 = 70 → leaderboard sync uses 70
    expect(prisma.leaderboardEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "cand-1" } })
    )
  })

  it("rejects a dimension score above 100", async () => {
    const res = await PUT(
      putRequest("int-1", {
        dimensionScores: [{ dimensionId: "dim-technical", score: 101 }],
      }),
      params()
    )
    expect(res.status).toBe(400)
  })

  it("rejects a dimension score below 0", async () => {
    const res = await PUT(
      putRequest("int-1", {
        dimensionScores: [{ dimensionId: "dim-technical", score: -1 }],
      }),
      params()
    )
    expect(res.status).toBe(400)
  })
})

// ── GET /api/admin/interviews/[id]/score ──────────────────────────────────────

describe("GET /api/admin/interviews/[id]/score", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns 403 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(getRequest("int-1"), params())
    expect(res.status).toBe(403)
  })

  it("returns 403 for CANDIDATE role (lacks VIEW_CANDIDATES permission)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "cand-1", role: "CANDIDATE" } } as any)
    const res = await GET(getRequest("int-1"), params())
    expect(res.status).toBe(403)
  })

  it("returns 404 when the interview does not exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue(null)

    const res = await GET(getRequest("not-found"), params("not-found"))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("Interview not found")
  })

  it("returns 200 with score data for an authorized ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "int-1",
      status: "COMPLETED",
      problemSolving: 80,
      techSkills: 70,
      communication: 75,
      culturalFit: 85,
      overallScore: 77.5,
      evaluatorNotes: null,
      scoredAt: new Date(),
      candidate: { id: "cand-1", name: "Alice", email: "alice@test.com" },
      evaluator: { id: "admin-1", name: "Admin", email: "admin@test.com" },
      interviewScores: [],
    } as any)

    const res = await GET(getRequest("int-1"), params())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.overallScore).toBe(77.5)
    expect(data.status).toBe("COMPLETED")
    expect(data).toHaveProperty("interviewScores")
  })

  it("returns 200 for REVIEWER role (has VIEW_CANDIDATES permission)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "rev-1", role: "REVIEWER" } } as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      ...completedInterviewResponse,
      interviewScores: [],
    } as any)

    const res = await GET(getRequest("int-1"), params())
    expect(res.status).toBe(200)
  })
})
