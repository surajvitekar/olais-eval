/**
 * Unit tests for GET /api/candidate/assessment/questions.
 *
 * Gap noted: the endpoint does NOT support a configurable ?count=N query
 * parameter — it always returns every question ordered by displayOrder.
 * If a count limit is added in future, tests should be added here.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessmentQuestion: { findMany: vi.fn() },
  },
}))

// Plain function so vi.resetAllMocks() does not clear the implementation.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GET } from "./questions/route"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockQuestions = [
  {
    id: "q1",
    category: "TECHNICAL",
    questionType: "MULTIPLE_CHOICE",
    questionText: "What is React?",
    options: ["A library", "A framework", "A database", "An OS"],
    weight: 1.0,
    displayOrder: 1,
  },
  {
    id: "q2",
    category: "SOFT_SKILLS",
    questionType: "RATING",
    questionText: "How do you handle conflict?",
    options: null,
    weight: 0.8,
    displayOrder: 2,
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/candidate/assessment/questions", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default to authenticated user for most tests
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any)
  })

  it("returns 401 Unauthorized when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)

    const result = (await GET()) as any

    expect(result.status).toBe(401)
    expect(result.body.error).toBe("Unauthorized")
  })

  it("returns 401 when session exists but user is absent", async () => {
    vi.mocked(auth).mockResolvedValue({ user: null } as any)

    const result = (await GET()) as any

    expect(result.status).toBe(401)
    expect(result.body.error).toBe("Unauthorized")
  })

  it("returns a questions array when the DB has records", async () => {
    vi.mocked(prisma.assessmentQuestion.findMany).mockResolvedValue(
      mockQuestions as any
    )

    const result = (await GET()) as any

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body.questions)).toBe(true)
    expect(result.body.questions).toHaveLength(2)
  })

  it("each question includes all required fields", async () => {
    vi.mocked(prisma.assessmentQuestion.findMany).mockResolvedValue(
      mockQuestions as any
    )

    const result = (await GET()) as any
    const q = result.body.questions[0]

    expect(q).toHaveProperty("id")
    expect(q).toHaveProperty("category")
    expect(q).toHaveProperty("questionType")
    expect(q).toHaveProperty("questionText")
    expect(q).toHaveProperty("options")
    expect(q).toHaveProperty("weight")
    expect(q).toHaveProperty("displayOrder")
  })

  it("returns an empty array (not an error) when no questions are configured", async () => {
    vi.mocked(prisma.assessmentQuestion.findMany).mockResolvedValue([])

    const result = (await GET()) as any

    expect(result.status).toBe(200)
    expect(result.body.questions).toEqual([])
  })

  it("queries questions ordered by displayOrder ascending", async () => {
    vi.mocked(prisma.assessmentQuestion.findMany).mockResolvedValue([])

    await GET()

    expect(prisma.assessmentQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { displayOrder: "asc" },
      })
    )
  })

  it("selects only the documented fields from the DB", async () => {
    vi.mocked(prisma.assessmentQuestion.findMany).mockResolvedValue([])

    await GET()

    expect(prisma.assessmentQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          category: true,
          questionType: true,
          questionText: true,
          options: true,
          weight: true,
          displayOrder: true,
        },
      })
    )
  })

  it("returns 500 and internal server error message when prisma throws", async () => {
    vi.mocked(prisma.assessmentQuestion.findMany).mockRejectedValue(
      new Error("DB connection failed")
    )

    const result = (await GET()) as any

    expect(result.status).toBe(500)
    expect(result.body.error).toBe("Internal server error")
  })
})
