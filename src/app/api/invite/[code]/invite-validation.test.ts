/**
 * Unit tests for invite validation logic in GET /api/invite/[code].
 *
 * The validation logic (expiry check, maxUses check, not-found handling) lives
 * entirely inside the route handler — there is no extracted helper function.
 * We test it by calling the exported GET handler directly, mocking both
 * @/lib/prisma and next/server so no real DB or HTTP server is needed.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"

// Mock prisma before the route module is imported
vi.mock("@/lib/prisma", () => ({
  prisma: {
    invite: { findUnique: vi.fn() },
  },
}))

// Mock NextResponse.json with a plain function so vi.resetAllMocks() does not
// clear the implementation. The handler just returns what NextResponse.json
// returns, so we use a simple shape { body, status } for easy assertions.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

import { prisma } from "@/lib/prisma"
import { GET } from "./route"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the second argument expected by the Next.js route handler. */
function makeContext(code: string) {
  return { params: Promise.resolve({ code }) }
}

const mockRequest = {} as Request

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/invite/[code] — invite validation", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns valid=true with full invite data for a valid unexpired invite with remaining uses", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days ahead

    vi.mocked(prisma.invite.findUnique).mockResolvedValue({
      code: "valid-code",
      expiresAt: futureDate,
      usedCount: 2,
      maxUses: 5,
    } as any)

    const result = (await GET(mockRequest, makeContext("valid-code"))) as any

    expect(result.body.valid).toBe(true)
    expect(result.body.code).toBe("valid-code")
    expect(result.body.usedCount).toBe(2)
    expect(result.body.maxUses).toBe(5)
    expect(result.body.expiresAt).toBe(futureDate.toISOString())
    // No error field on a valid invite
    expect(result.body.error).toBeUndefined()
    expect(result.status).toBe(200)
  })

  it("returns valid=false with expiry error when expiresAt is in the past", async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago

    vi.mocked(prisma.invite.findUnique).mockResolvedValue({
      code: "expired-code",
      expiresAt: pastDate,
      usedCount: 0,
      maxUses: 5,
    } as any)

    const result = (await GET(mockRequest, makeContext("expired-code"))) as any

    expect(result.body.valid).toBe(false)
    expect(result.body.error).toBe("Invite code has expired")
    expect(result.status).toBe(200)
  })

  it("returns valid=false with max-uses error when usedCount equals maxUses", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    vi.mocked(prisma.invite.findUnique).mockResolvedValue({
      code: "exhausted-code",
      expiresAt: futureDate,
      usedCount: 5,
      maxUses: 5,
    } as any)

    const result = (await GET(mockRequest, makeContext("exhausted-code"))) as any

    expect(result.body.valid).toBe(false)
    expect(result.body.error).toBe("Invite code has reached maximum uses")
  })

  it("returns valid=false with max-uses error when usedCount exceeds maxUses", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    vi.mocked(prisma.invite.findUnique).mockResolvedValue({
      code: "over-used-code",
      expiresAt: futureDate,
      usedCount: 10,
      maxUses: 5,
    } as any)

    const result = (await GET(mockRequest, makeContext("over-used-code"))) as any

    expect(result.body.valid).toBe(false)
    expect(result.body.error).toBe("Invite code has reached maximum uses")
  })

  it("returns valid=false with 'Invalid invite code' when the code does not exist in DB", async () => {
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(null)

    const result = (await GET(mockRequest, makeContext("nonexistent-code"))) as any

    expect(result.body.valid).toBe(false)
    expect(result.body.error).toBe("Invalid invite code")
    expect(result.status).toBe(200)
  })

  it("queries prisma with the correct code from the route params", async () => {
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(null)

    await GET(mockRequest, makeContext("lookup-target"))

    expect(prisma.invite.findUnique).toHaveBeenCalledWith({
      where: { code: "lookup-target" },
    })
  })

  it("returns 500 and internal server error message when prisma throws", async () => {
    vi.mocked(prisma.invite.findUnique).mockRejectedValue(
      new Error("DB connection lost")
    )

    const result = (await GET(mockRequest, makeContext("any-code"))) as any

    expect(result.status).toBe(500)
    expect(result.body.error).toBe("Internal server error")
  })
})
