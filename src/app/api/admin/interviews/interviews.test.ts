import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/prisma", () => {
  const prisma = {
    interview: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    leaderboardEntry: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    interviewScore: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    scoringDimension: {
      findMany: vi.fn(),
    },
    interviewEvaluator: {
      upsert: vi.fn(),
    },
  }
  return { prisma, default: prisma }
})

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { POST, GET } from "./route"
import { PUT as scorePUT } from "./[id]/score/route"

const mockAuth = vi.mocked(auth)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const adminSession = {
  user: { id: "admin-1", role: "ADMIN", email: "admin@example.com" },
}

const candidateSession = {
  user: { id: "cand-1", role: "CANDIDATE", email: "cand@example.com" },
}

const mockCandidate = {
  id: "candidate-1",
  role: "CANDIDATE",
  status: "SUBMITTED",
}

const createdInterview = {
  id: "interview-1",
  candidateId: "candidate-1",
  evaluatorId: "admin-1",
  scheduledAt: new Date("2026-06-20T10:00:00Z"),
  duration: 60,
  timezone: "UTC",
  notes: null,
  meetingLink: null,
  status: "SCHEDULED",
  overallScore: null,
  scoredAt: null,
  candidate: { id: "candidate-1", name: "Alice", email: "alice@example.com" },
  evaluator: { id: "admin-1", name: "Admin", email: "admin@example.com" },
  interviewEvaluators: [
    {
      id: "ie-1",
      interviewId: "interview-1",
      userId: "admin-1",
      role: "LEAD",
      user: { id: "admin-1", name: "Admin", email: "admin@example.com" },
    },
  ],
}

const completedInterview = {
  ...createdInterview,
  status: "COMPLETED",
  problemSolving: 80,
  techSkills: 75,
  communication: 85,
  culturalFit: 90,
  overallScore: 82.5,
  scoredAt: new Date("2026-06-20T11:00:00Z"),
  evaluatorNotes: "Strong candidate",
}

// ── POST /api/admin/interviews ────────────────────────────────────────────────

describe("POST /api/admin/interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
  })

  it("returns 403 for a CANDIDATE caller", async () => {
    mockAuth.mockResolvedValue(candidateSession as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "candidate-1",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 403 when there is no session", async () => {
    mockAuth.mockResolvedValue(null as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "candidate-1",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it("returns 400 when candidateId is missing", async () => {
    mockAuth.mockResolvedValue(adminSession as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("Invalid input")
    expect(json.details).toHaveProperty("candidateId")
  })

  it("returns 400 when scheduledAt is missing", async () => {
    mockAuth.mockResolvedValue(adminSession as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "candidate-1",
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("Invalid input")
    expect(json.details).toHaveProperty("scheduledAt")
  })

  it("returns 400 when candidateId is an empty string", async () => {
    mockAuth.mockResolvedValue(adminSession as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("Invalid input")
  })

  it("returns 400 when the candidate user does not exist", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "nonexistent",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("Invalid candidate")
  })

  it("returns 400 when the candidateId points to a non-CANDIDATE user", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      status: "ACTIVE",
    } as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "admin-2",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("Invalid candidate")
  })

  it("creates an interview with status SCHEDULED and returns 201", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockCandidate as any)
    vi.mocked(prisma.interview.create).mockResolvedValue(createdInterview as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "candidate-1",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.id).toBe("interview-1")
    expect(json.status).toBe("SCHEDULED")
    expect(json.candidateId).toBe("candidate-1")

    // interview.create called with SCHEDULED status
    expect(prisma.interview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          candidateId: "candidate-1",
          scheduledAt: expect.any(Date),
          status: "SCHEDULED",
        }),
      })
    )
  })

  it("auto-advances candidate status to UNDER_REVIEW for SUBMITTED candidate", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockCandidate,
      status: "SUBMITTED",
    } as any)
    vi.mocked(prisma.interview.create).mockResolvedValue(createdInterview as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "candidate-1",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    await POST(req)

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "candidate-1" },
        data: { status: "UNDER_REVIEW" },
      })
    )
  })

  it("does NOT update candidate status when status is not SUBMITTED or ASSESSMENT_COMPLETED", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockCandidate,
      status: "UNDER_REVIEW",
    } as any)
    vi.mocked(prisma.interview.create).mockResolvedValue(createdInterview as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "candidate-1",
        scheduledAt: "2026-06-20T10:00:00Z",
      }),
    })
    await POST(req)

    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("uses optional fields (duration, timezone, notes, meetingLink) when provided", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockCandidate as any)
    vi.mocked(prisma.interview.create).mockResolvedValue(createdInterview as any)

    const req = new Request("http://localhost/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "candidate-1",
        scheduledAt: "2026-06-20T10:00:00Z",
        duration: 45,
        timezone: "Asia/Kolkata",
        notes: "Technical interview",
        meetingLink: "https://meet.google.com/abc-xyz",
      }),
    })
    await POST(req)

    expect(prisma.interview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          duration: 45,
          timezone: "Asia/Kolkata",
          notes: "Technical interview",
          meetingLink: "https://meet.google.com/abc-xyz",
        }),
      })
    )
  })
})

// ── GET /api/admin/interviews ─────────────────────────────────────────────────

describe("GET /api/admin/interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 403 for a CANDIDATE caller", async () => {
    mockAuth.mockResolvedValue(candidateSession as any)

    const req = new Request("http://localhost/api/admin/interviews")
    const res = await GET(req)

    expect(res.status).toBe(403)
  })

  it("returns paginated interview list for an admin", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findMany).mockResolvedValue([createdInterview] as any)
    vi.mocked(prisma.interview.count).mockResolvedValue(1)

    const req = new Request("http://localhost/api/admin/interviews")
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.interviews).toHaveLength(1)
    expect(json.interviews[0].id).toBe("interview-1")
    expect(json.pagination).toMatchObject({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    })
  })

  it("returns empty list when no interviews exist", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findMany).mockResolvedValue([])
    vi.mocked(prisma.interview.count).mockResolvedValue(0)

    const req = new Request("http://localhost/api/admin/interviews")
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.interviews).toHaveLength(0)
    expect(json.pagination.total).toBe(0)
    expect(json.pagination.totalPages).toBe(0)
  })
})

// ── PUT /api/admin/interviews/[id]/score — status SCHEDULED → COMPLETED ──────

describe("PUT /api/admin/interviews/[id]/score (status transition)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 403 for a CANDIDATE caller", async () => {
    mockAuth.mockResolvedValue(candidateSession as any)

    const req = new Request("http://localhost/api/admin/interviews/interview-1/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemSolving: 80, techSkills: 75 }),
    })
    const res = await scorePUT(req, {
      params: Promise.resolve({ id: "interview-1" }),
    })

    expect(res.status).toBe(403)
  })

  it("returns 404 when interview does not exist", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue(null)

    const req = new Request("http://localhost/api/admin/interviews/nonexistent/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemSolving: 80 }),
    })
    const res = await scorePUT(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe("Interview not found")
  })

  it("returns 400 when interview status is CANCELLED", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "interview-1",
      status: "CANCELLED",
      candidateId: "candidate-1",
    } as any)

    const req = new Request("http://localhost/api/admin/interviews/interview-1/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemSolving: 80 }),
    })
    const res = await scorePUT(req, {
      params: Promise.resolve({ id: "interview-1" }),
    })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/SCHEDULED or COMPLETED/)
  })

  it("returns 400 when no score dimension is provided (legacy mode)", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "interview-1",
      status: "SCHEDULED",
      candidateId: "candidate-1",
    } as any)

    // Legacy body with none of the 4 dimensions
    const req = new Request("http://localhost/api/admin/interviews/interview-1/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evaluatorNotes: "notes only" }),
    })
    const res = await scorePUT(req, {
      params: Promise.resolve({ id: "interview-1" }),
    })
    const json = await res.json()

    // Dynamic scoring path will be taken; dimensionScores missing → validation error
    expect(res.status).toBe(400)
  })

  it("transitions SCHEDULED interview to COMPLETED via legacy scoring", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "interview-1",
      status: "SCHEDULED",
      candidateId: "candidate-1",
    } as any)
    vi.mocked(prisma.interview.update).mockResolvedValue(completedInterview as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.create).mockResolvedValue({} as any)

    const req = new Request("http://localhost/api/admin/interviews/interview-1/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemSolving: 80,
        techSkills: 75,
        communication: 85,
        culturalFit: 90,
        evaluatorNotes: "Strong candidate",
      }),
    })
    const res = await scorePUT(req, {
      params: Promise.resolve({ id: "interview-1" }),
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe("COMPLETED")
    expect(json.overallScore).toBe(82.5)

    // interview.update called with COMPLETED status and scores
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "interview-1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          problemSolving: 80,
          techSkills: 75,
          communication: 85,
          culturalFit: 90,
          overallScore: 82.5,
          scoredAt: expect.any(Date),
        }),
      })
    )
  })

  it("computes overallScore as the average of provided legacy dimensions", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "interview-1",
      status: "SCHEDULED",
      candidateId: "candidate-1",
    } as any)
    vi.mocked(prisma.interview.update).mockResolvedValue({
      ...completedInterview,
      problemSolving: 60,
      techSkills: 80,
      communication: null,
      culturalFit: null,
      overallScore: 70,
    } as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.create).mockResolvedValue({} as any)

    const req = new Request("http://localhost/api/admin/interviews/interview-1/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemSolving: 60,
        techSkills: 80,
      }),
    })
    await scorePUT(req, { params: Promise.resolve({ id: "interview-1" }) })

    // overallScore = (60 + 80) / 2 = 70
    expect(prisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overallScore: 70,
        }),
      })
    )
  })

  it("also re-scores a COMPLETED interview (idempotent rescore)", async () => {
    mockAuth.mockResolvedValue(adminSession as any)
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "interview-1",
      status: "COMPLETED",
      candidateId: "candidate-1",
    } as any)
    vi.mocked(prisma.interview.update).mockResolvedValue(completedInterview as any)
    vi.mocked(prisma.leaderboardEntry.findFirst).mockResolvedValue({
      id: "lb-1",
      evaluationScore: 75,
      interviewScore: 82.5,
      combinedScore: 78.75,
    } as any)
    vi.mocked(prisma.leaderboardEntry.update).mockResolvedValue({} as any)

    const req = new Request("http://localhost/api/admin/interviews/interview-1/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemSolving: 80,
        techSkills: 75,
        communication: 85,
        culturalFit: 90,
      }),
    })
    const res = await scorePUT(req, {
      params: Promise.resolve({ id: "interview-1" }),
    })

    expect(res.status).toBe(200)
    expect(prisma.leaderboardEntry.update).toHaveBeenCalled()
  })
})
