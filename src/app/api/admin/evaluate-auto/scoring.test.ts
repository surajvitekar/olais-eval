import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/prisma", () => {
  const prisma = {
    submission: { findUnique: vi.fn() },
    leaderboardEntry: { findFirst: vi.fn(), update: vi.fn() },
    evaluation: { create: vi.fn() },
    user: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  }
  return { prisma, default: prisma }
})

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GET, POST } from "./[submissionId]/route"

const mockAuth = vi.mocked(auth)

// ── Fixtures ─────────────────────────────────────────────────────────────────

const adminSession = {
  user: { id: "admin-1", role: "ADMIN", email: "admin@example.com" },
}

const candidateSession = {
  user: { id: "cand-1", role: "CANDIDATE", email: "cand@example.com" },
}

const baseSubmission = {
  id: "sub-1",
  userId: "user-1",
  submittedAt: new Date("2026-06-01T10:00:00Z"),
  evaluations: [],
  user: {
    id: "user-1",
    name: "Alice",
    email: "alice@example.com",
    status: "SUBMITTED",
  },
}

const submissionWithProblem = {
  id: "sub-1",
  userId: "user-1",
  submittedAt: new Date("2026-06-01T10:00:00Z"),
  gitUrl: "https://github.com/alice/project",
  liveUrl: null,
  architectureNotes: null,
  aiUsageExplanation: null,
  videoUrl: null,
  screenshots: [],
  elapsedSeconds: 3600,
  user: {
    id: "user-1",
    name: "Alice",
    email: "alice@example.com",
    status: "SUBMITTED",
  },
  assignedProblem: {
    template: {
      title: "Build a CRUD API",
      slug: "build-crud-api",
      category: "backend",
      difficulty: "MEDIUM",
      overview: "Build a REST CRUD API with authentication",
      requirements: ["CRUD endpoints", "JWT auth"],
      constraints: ["Must use REST"],
      evaluationCriteria: ["Correctness", "Performance"],
    },
  },
}

const completedEvaluation = {
  id: "eval-1",
  submissionId: "sub-1",
  evaluatorId: "admin-1",
  executionScore: 8,
  thoughtProcessScore: 7,
  architectureScore: 8,
  uiUxScore: 7,
  aiUsageScore: 8,
  deploymentScore: 7,
  codeOrganizationScore: 8,
  communicationScore: 7,
  totalScore: 7.5,
  notes: "Good submission",
  status: "COMPLETED",
  createdAt: new Date("2026-06-01T11:00:00Z"),
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/evaluate-auto/[submissionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 403 when there is no session", async () => {
    mockAuth.mockResolvedValue(null as any)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1")
    const res = await GET(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 403 for a CANDIDATE caller", async () => {
    mockAuth.mockResolvedValue(candidateSession as any)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1")
    const res = await GET(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 404 when submission does not exist", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/evaluate-auto/nonexistent")
    const res = await GET(req, {
      params: Promise.resolve({ submissionId: "nonexistent" }),
    })
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe("Submission not found")
  })

  it("returns evaluation status for an existing submission with a completed evaluation", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      ...baseSubmission,
      evaluations: [completedEvaluation],
    } as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue({
      evaluationScore: 7.5,
      combinedScore: 7.5,
      interviewScore: null,
    } as any)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1")
    const res = await GET(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.submissionId).toBe("sub-1")
    expect(json.userId).toBe("user-1")
    expect(json.evaluation).not.toBeNull()
    expect(json.evaluation.id).toBe("eval-1")
    expect(json.evaluation.status).toBe("COMPLETED")
    expect(json.userStatus).toBe("SUBMITTED")
    expect(json.leaderboard?.evaluationScore).toBe(7.5)
  })

  it("returns null evaluation when no completed evaluation exists", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      ...baseSubmission,
      evaluations: [],
    } as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1")
    const res = await GET(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.evaluation).toBeNull()
    expect(json.leaderboard).toBeNull()
  })

  it("includes submittedAt as an ISO string", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      ...baseSubmission,
      evaluations: [],
    } as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1")
    const res = await GET(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(typeof json.submittedAt).toBe("string")
    expect(json.submittedAt).toBe("2026-06-01T10:00:00.000Z")
  })
})

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/evaluate-auto/[submissionId]", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mockFetch)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any)
  })

  it("returns 403 when there is no session", async () => {
    mockAuth.mockResolvedValue(null as any)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 403 for a CANDIDATE caller", async () => {
    mockAuth.mockResolvedValue(candidateSession as any)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ submissionId: "sub-1" }) })

    expect(res.status).toBe(403)
  })

  it("returns 404 when submission does not exist", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    const res = await POST(req, {
      params: Promise.resolve({ submissionId: "nonexistent" }),
    })
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe("Submission not found")
  })

  it("calls AIO2 API with correct payload and creates evaluation record", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      submissionWithProblem as any
    )

    const aio2Response = {
      executionScore: 8,
      thoughtProcessScore: 7,
      architectureScore: 8,
      uiUxScore: 7,
      aiUsageScore: 8,
      deploymentScore: 7,
      codeOrganizationScore: 8,
      communicationScore: 7,
      totalScore: 7.5,
      notes: "Great work overall",
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => aio2Response,
    })

    vi.mocked(prisma.evaluation.create).mockResolvedValue(completedEvaluation as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.candidateStatus).toBe("UNDER_REVIEW")
    expect(json.evaluation.id).toBe("eval-1")
    expect(json.evaluation.status).toBe("COMPLETED")

    // AIO2 fetch was called with POST and JSON payload
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain("evaluate-submission")
    expect(opts.method).toBe("POST")
    const body = JSON.parse(opts.body)
    expect(body.submissionId).toBe("sub-1")
    expect(body.candidate.name).toBe("Alice")
    expect(body.candidate.email).toBe("alice@example.com")
    expect(body.problem.slug).toBe("build-crud-api")
    expect(body.problem.title).toBe("Build a CRUD API")

    // Evaluation created with correct shape
    expect(prisma.evaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: "sub-1",
          evaluatorId: "admin-1",
          status: "COMPLETED",
          totalScore: 7.5,
          notes: "Great work overall",
        }),
      })
    )
  })

  it("updates leaderboard entry when an existing entry is found", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      submissionWithProblem as any
    )
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ totalScore: 80 }),
    })
    vi.mocked(prisma.evaluation.create).mockResolvedValue({
      ...completedEvaluation,
      totalScore: 80,
    } as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue({
      id: "lb-1",
      interviewScore: 70,
      evaluationScore: 75,
      combinedScore: 72,
    } as any)
    vi.mocked(prisma.leaderboardEntry.update).mockResolvedValue({} as any)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    await POST(req, { params: Promise.resolve({ submissionId: "sub-1" }) })

    expect(prisma.leaderboardEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lb-1" },
        data: expect.objectContaining({
          evaluationScore: 80,
          combinedScore: expect.any(Number),
        }),
      })
    )
  })

  it("updates user status to UNDER_REVIEW after evaluation", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      submissionWithProblem as any
    )
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ totalScore: 70 }),
    })
    vi.mocked(prisma.evaluation.create).mockResolvedValue(completedEvaluation as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    await POST(req, { params: Promise.resolve({ submissionId: "sub-1" }) })

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { status: "UNDER_REVIEW" },
      })
    )
  })

  it("supports nested scores format (aiResult.scores.*)", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      submissionWithProblem as any
    )
    // AIO2 returns scores in nested format
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        scores: {
          executionScore: 9,
          thoughtProcessScore: 8,
          architectureScore: 9,
          uiUxScore: 8,
          aiUsageScore: 9,
          deploymentScore: 8,
          codeOrganizationScore: 9,
          communicationScore: 8,
          totalScore: 8.5,
        },
        feedback: "Excellent nested format response",
      }),
    })
    vi.mocked(prisma.evaluation.create).mockResolvedValue({
      ...completedEvaluation,
      totalScore: 8.5,
      notes: "Excellent nested format response",
    } as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    // Evaluation create call extracts nested scores
    expect(prisma.evaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executionScore: 9,
          architectureScore: 9,
        }),
      })
    )
  })

  it("returns 500 with AIO2 error message when upstream API fails", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      submissionWithProblem as any
    )
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    })

    const req = new Request("http://localhost/api/admin/evaluate-auto/sub-1", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ submissionId: "sub-1" }) })
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/AIO²/)
    expect(json.error).toMatch(/503/)
  })
})
