import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

// --- Mocks must be declared before any imports that transitively load the mocked modules ---

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignedProblem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  default: {
    assignedProblem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/problem-assigner", () => ({
  assignProblems: vi.fn(),
}))

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assignProblems } from "@/lib/problem-assigner"
import { POST } from "./route"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(userId = "user-1") {
  return { user: { id: userId, role: "CANDIDATE" } }
}

const PROBLEM_ID = "problem-abc"

function makePick(id = PROBLEM_ID) {
  return { id, variantGroup: "group-1" }
}

/** Build a fake AssignedProblem returned by prisma.assignedProblem.create */
function makeAssignment(overrides: Partial<{ deadline: Date | null }> = {}) {
  return {
    id: "ap-1",
    userId: "user-1",
    problemTemplateId: PROBLEM_ID,
    status: "ASSIGNED",
    variantConfig: {},
    assignedAt: new Date(),
    deadline: overrides.deadline ?? new Date(Date.now() + 72 * 60 * 60 * 1000),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("assign route — deadline enforcement", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(auth).mockResolvedValue(makeSession() as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
    vi.mocked(assignProblems).mockResolvedValue([makePick()] as any)
  })

  afterEach(() => {
    delete process.env.PROBLEM_DEADLINE_HOURS
  })

  // -------------------------------------------------------------------------
  // 1. Fresh assignment (0 existing) — batch path via $transaction
  // -------------------------------------------------------------------------

  it("sets a deadline in the future when creating a fresh batch assignment", async () => {
    vi.mocked(prisma.assignedProblem.findMany).mockResolvedValue([])

    const capturedData: Array<{ deadline?: Date }> = []

    // $transaction receives a callback; call it with a tx proxy that captures create() args
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const txProxy = {
        assignedProblem: {
          create: vi.fn().mockImplementation(({ data }: { data: any }) => {
            capturedData.push(data)
            return Promise.resolve(makeAssignment({ deadline: data.deadline }))
          }),
        },
      }
      return fn(txProxy)
    })

    const before = new Date()
    await POST()
    const after = new Date()

    expect(capturedData).toHaveLength(1)
    const { deadline } = capturedData[0]
    expect(deadline).toBeDefined()
    expect(deadline!.getTime()).toBeGreaterThan(after.getTime())
    expect(deadline!.getTime()).toBeGreaterThan(before.getTime())
  })

  // -------------------------------------------------------------------------
  // 2. Deadline is approximately PROBLEM_DEADLINE_HOURS hours from now
  // -------------------------------------------------------------------------

  it("deadline is approximately 72 hours from now (within 5-second tolerance)", async () => {
    vi.mocked(prisma.assignedProblem.findMany).mockResolvedValue([])

    const capturedData: Array<{ deadline?: Date }> = []
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const txProxy = {
        assignedProblem: {
          create: vi.fn().mockImplementation(({ data }: { data: any }) => {
            capturedData.push(data)
            return Promise.resolve(makeAssignment({ deadline: data.deadline }))
          }),
        },
      }
      return fn(txProxy)
    })

    const now = Date.now()
    await POST()

    const { deadline } = capturedData[0]
    const expectedMs = 72 * 60 * 60 * 1000
    const diff = deadline!.getTime() - now
    expect(diff).toBeGreaterThan(expectedMs - 5000)
    expect(diff).toBeLessThan(expectedMs + 5000)
  })

  it("respects PROBLEM_DEADLINE_HOURS env var (e.g. 48 hours)", async () => {
    process.env.PROBLEM_DEADLINE_HOURS = "48"
    vi.mocked(prisma.assignedProblem.findMany).mockResolvedValue([])

    const capturedData: Array<{ deadline?: Date }> = []
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const txProxy = {
        assignedProblem: {
          create: vi.fn().mockImplementation(({ data }: { data: any }) => {
            capturedData.push(data)
            return Promise.resolve(makeAssignment({ deadline: data.deadline }))
          }),
        },
      }
      return fn(txProxy)
    })

    const now = Date.now()
    await POST()

    const { deadline } = capturedData[0]
    const expectedMs = 48 * 60 * 60 * 1000
    const diff = deadline!.getTime() - now
    expect(diff).toBeGreaterThan(expectedMs - 5000)
    expect(diff).toBeLessThan(expectedMs + 5000)
  })

  // -------------------------------------------------------------------------
  // 3. Re-assigning (1 existing) — single-create path is idempotent
  // -------------------------------------------------------------------------

  it("sets a deadline on the second assignment when one already exists", async () => {
    const existingDeadline = new Date(Date.now() + 50 * 60 * 60 * 1000)
    vi.mocked(prisma.assignedProblem.findMany).mockResolvedValue([
      makeAssignment({ deadline: existingDeadline }) as any,
    ])

    let capturedDeadline: Date | undefined
    vi.mocked(prisma.assignedProblem.create).mockImplementation(({ data }: { data: any }) => {
      capturedDeadline = data.deadline
      return Promise.resolve(makeAssignment({ deadline: data.deadline })) as any
    })

    const now = Date.now()
    await POST()

    expect(capturedDeadline).toBeDefined()
    // The new assignment gets its own fresh deadline (not the old one)
    const expectedMs = 72 * 60 * 60 * 1000
    const diff = capturedDeadline!.getTime() - now
    expect(diff).toBeGreaterThan(expectedMs - 5000)
    expect(diff).toBeLessThan(expectedMs + 5000)
    // The existing assignment's deadline is NOT touched
    expect(capturedDeadline!.getTime()).not.toBe(existingDeadline.getTime())
  })

  it("does not call create at all when candidate already has 2 assignments", async () => {
    vi.mocked(prisma.assignedProblem.findMany).mockResolvedValue([
      makeAssignment() as any,
      makeAssignment() as any,
    ])

    await POST()

    expect(prisma.assignedProblem.create).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
