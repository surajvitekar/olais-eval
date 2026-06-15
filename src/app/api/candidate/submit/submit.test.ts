import { vi, describe, it, expect, beforeEach } from "vitest"

// Mocks must be declared before any imports that load the mocked modules.

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignedProblem: { findFirst: vi.fn(), update: vi.fn() },
    submission: { findUnique: vi.fn(), create: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid request body that passes Zod validation. */
const VALID_BODY = {
  assignedProblemId: "ap-1",
  gitUrl: "https://github.com/candidate/project",
  liveUrl: null,
  architectureNotes: "Described the full system design with clear component boundaries and trade-offs.",
  aiUsageExplanation: "Used GitHub Copilot to generate boilerplate and unit tests.",
  videoUrl: null,
  screenshots: [],
  elapsedSeconds: 3600,
}

function makeRequest(body: object) {
  return new Request("http://localhost/api/candidate/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

/** A minimal assigned-problem row with no deadline (never expires). */
function makeAssignedProblem(overrides: { deadline?: Date | null } = {}) {
  return {
    id: "ap-1",
    userId: "user-1",
    problemTemplateId: "pt-1",
    status: "ASSIGNED",
    variantConfig: {},
    assignedAt: new Date(),
    deadline: overrides.deadline !== undefined ? overrides.deadline : null,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/candidate/submit", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Default: authenticated candidate
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "CANDIDATE" },
    } as any)

    // Default $transaction: execute the callback synchronously using `prisma` as the tx
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(prisma)
      return Promise.all(fn)
    })
  })

  // -------------------------------------------------------------------------
  // Auth / ownership guards
  // -------------------------------------------------------------------------

  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)

    const data = await res.json()
    expect(data.error).toMatch(/unauthorized/i)
  })

  it("returns 404 when assignedProblemId does not belong to this user", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(null)

    const res = await POST(makeRequest(VALID_BODY))
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe("Problem not found")
  })

  // -------------------------------------------------------------------------
  // Deadline enforcement
  // -------------------------------------------------------------------------

  it("returns 422 DEADLINE_EXCEEDED when the deadline has passed", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem({ deadline: oneHourAgo }) as any
    )

    const res = await POST(makeRequest(VALID_BODY))
    const data = await res.json()

    expect(res.status).toBe(422)
    expect(data.code).toBe("DEADLINE_EXCEEDED")
  })

  it("allows submission when the deadline is in the future", async () => {
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000)
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem({ deadline: inOneHour }) as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-1" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)
  })

  it("allows submission when no deadline is set (null)", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem({ deadline: null }) as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-2" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)
  })

  // -------------------------------------------------------------------------
  // Duplicate detection
  // -------------------------------------------------------------------------

  it("returns 409 DUPLICATE_SUBMISSION when the user already submitted this problem", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem() as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      id: "sub-existing",
      userId: "user-1",
      assignedProblemId: "ap-1",
    } as any)

    const res = await POST(makeRequest(VALID_BODY))
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.code).toBe("DUPLICATE_SUBMISSION")
  })

  // -------------------------------------------------------------------------
  // Happy path — database writes
  // -------------------------------------------------------------------------

  it("creates a Submission record with the correct fields on a valid submission", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem() as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-happy" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await POST(makeRequest(VALID_BODY))
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.submissionId).toBe("sub-happy")

    expect(prisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          assignedProblemId: "ap-1",
          gitUrl: VALID_BODY.gitUrl,
          architectureNotes: VALID_BODY.architectureNotes,
          aiUsageExplanation: VALID_BODY.aiUsageExplanation,
        }),
      })
    )
  })

  it("updates AssignedProblem status to SUBMITTED inside the transaction", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem() as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-1" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    await POST(makeRequest(VALID_BODY))

    expect(prisma.assignedProblem.update).toHaveBeenCalledWith({
      where: { id: "ap-1" },
      data: { status: "SUBMITTED" },
    })
  })

  it("updates User status to SUBMITTED inside the transaction", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem() as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-1" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    await POST(makeRequest(VALID_BODY))

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { status: "SUBMITTED" },
    })
  })

  it("wraps submission.create, assignedProblem.update and user.update in a $transaction", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem() as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-1" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    await POST(makeRequest(VALID_BODY))

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // Input validation (Zod)
  // -------------------------------------------------------------------------

  it("returns 400 when aiUsageExplanation is missing", async () => {
    const { aiUsageExplanation: _omit, ...bodyWithout } = VALID_BODY

    const res = await POST(makeRequest(bodyWithout))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  it("returns 400 when architectureNotes is too short (< 10 chars)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, architectureNotes: "Short" }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  it("returns 400 when gitUrl is not a valid URL or git@ URL", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, gitUrl: "not-a-url" }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  it("accepts SSH-style git@ URLs", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem() as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-ssh" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await POST(
      makeRequest({ ...VALID_BODY, gitUrl: "git@github.com:user/repo.git" })
    )
    expect(res.status).toBe(201)
  })

  it("returns 400 when assignedProblemId is missing", async () => {
    const { assignedProblemId: _omit, ...bodyWithout } = VALID_BODY

    const res = await POST(makeRequest(bodyWithout))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  // -------------------------------------------------------------------------
  // Optional fields are handled gracefully
  // -------------------------------------------------------------------------

  it("returns 201 when optional fields (liveUrl, videoUrl, screenshots, elapsedSeconds) are omitted", async () => {
    vi.mocked(prisma.assignedProblem.findFirst).mockResolvedValue(
      makeAssignedProblem() as any
    )
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-min" } as any)
    vi.mocked(prisma.assignedProblem.update).mockResolvedValue({} as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const minBody = {
      assignedProblemId: VALID_BODY.assignedProblemId,
      gitUrl: VALID_BODY.gitUrl,
      architectureNotes: VALID_BODY.architectureNotes,
      aiUsageExplanation: VALID_BODY.aiUsageExplanation,
    }

    const res = await POST(makeRequest(minBody))
    expect(res.status).toBe(201)
  })
})
