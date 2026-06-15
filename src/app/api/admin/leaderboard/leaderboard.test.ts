/**
 * Tests for Stage 11 (Leaderboard & Cutoffs)
 *
 * Covers:
 *  - GET  /api/admin/leaderboard      — admin view (all entries, including hidden)
 *  - PUT  /api/admin/leaderboard/[id] — visibility toggle with audit log
 *  - GET  /api/leaderboard            — public view (hidden=false only, gamification fields)
 *
 * GAPS FOUND (no tests written for missing behaviour):
 *  - No server-side ?cutoff=N or ?minScore=N filtering exists in any leaderboard endpoint.
 *    Both the admin and public routes ignore these query params entirely.
 *    Filtering by score threshold appears to be client-side only.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    leaderboardEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
// Admin endpoint: GET + DELETE
import { GET as adminGet } from "./route"
// Per-entry visibility toggle
import { PUT as adminIdPut } from "@/app/api/admin/leaderboard/[id]/route"
// Public endpoint
import { GET as publicGet } from "@/app/api/leaderboard/route"

const mockAuth = vi.mocked(auth)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(role: string, id = "admin-1") {
  return { user: { id, role } }
}

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    userId: "user-1",
    cycleId: "2026-06",
    combinedScore: 85.0,
    evaluationScore: 80.0,
    interviewScore: 90.0,
    submissionCount: 3,
    fastestTime: 1200,
    hidden: false,
    xp: 600,
    level: 2,
    badges: "[]",
    previousRank: null,
    status: "active",
    user: {
      id: "user-1",
      name: "Alice",
      email: "alice@test.com",
      status: "SHORTLISTED",
    },
    ...overrides,
  }
}

// ── GET /api/admin/leaderboard ────────────────────────────────────────────────

describe("GET /api/admin/leaderboard", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns 403 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await adminGet()
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 403 for a REVIEWER (non-ADMIN role)", async () => {
    mockAuth.mockResolvedValue(makeSession("REVIEWER") as any)
    const res = await adminGet()
    expect(res.status).toBe(403)
  })

  it("returns 403 for a CANDIDATE role", async () => {
    mockAuth.mockResolvedValue(makeSession("CANDIDATE") as any)
    const res = await adminGet()
    expect(res.status).toBe(403)
  })

  it("returns 200 with entries array for ADMIN", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([makeEntry()] as any)

    const res = await adminGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.entries)).toBe(true)
    expect(data.entries).toHaveLength(1)
  })

  it("includes hidden entries — admin sees everything", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    const entries = [
      makeEntry({ hidden: false }),
      makeEntry({ id: "entry-2", userId: "user-2", hidden: true }),
    ]
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue(entries as any)

    const res = await adminGet()
    const data = await res.json()
    expect(data.entries).toHaveLength(2)
    expect(data.entries.some((e: any) => e.hidden === true)).toBe(true)
    expect(data.entries.some((e: any) => e.hidden === false)).toBe(true)
  })

  it("each entry exposes userId, combinedScore, evaluationScore, and interviewScore", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([makeEntry()] as any)

    const res = await adminGet()
    const { entries } = await res.json()
    const entry = entries[0]
    expect(entry).toHaveProperty("userId", "user-1")
    expect(entry).toHaveProperty("combinedScore", 85.0)
    expect(entry).toHaveProperty("evaluationScore", 80.0)
    expect(entry).toHaveProperty("interviewScore", 90.0)
  })

  it("maps null scores to explicit null (not undefined)", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([
      makeEntry({ evaluationScore: null, interviewScore: null, combinedScore: null }),
    ] as any)

    const res = await adminGet()
    const { entries } = await res.json()
    expect(entries[0].evaluationScore).toBeNull()
    expect(entries[0].interviewScore).toBeNull()
    expect(entries[0].combinedScore).toBeNull()
  })

  it("returns 500 on unexpected prisma error", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    vi.mocked(prisma.leaderboardEntry.findMany).mockRejectedValue(new Error("DB down"))

    const res = await adminGet()
    expect(res.status).toBe(500)
  })
})

// ── PUT /api/admin/leaderboard/[id] (visibility toggle) ───────────────────────

describe("PUT /api/admin/leaderboard/[id]", () => {
  beforeEach(() => vi.resetAllMocks())

  function makeRequest(id: string, body: unknown) {
    return new Request(`http://localhost/api/admin/leaderboard/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  }

  it("returns 403 for non-ADMIN role", async () => {
    mockAuth.mockResolvedValue(makeSession("REVIEWER") as any)
    const res = await adminIdPut(makeRequest("entry-1", { hidden: true }), {
      params: Promise.resolve({ id: "entry-1" }),
    })
    expect(res.status).toBe(403)
  })

  it("returns 400 for a non-boolean hidden value", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    const res = await adminIdPut(makeRequest("entry-1", { hidden: "yes" }), {
      params: Promise.resolve({ id: "entry-1" }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid input")
  })

  it("returns 404 when the entry does not exist", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    vi.mocked(prisma.leaderboardEntry.findUnique).mockResolvedValue(null)

    const res = await adminIdPut(makeRequest("no-such-entry", { hidden: true }), {
      params: Promise.resolve({ id: "no-such-entry" }),
    })
    expect(res.status).toBe(404)
  })

  it("updates the hidden field and returns the updated entry", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    const existing = makeEntry()
    const updated = { ...existing, hidden: true }
    vi.mocked(prisma.leaderboardEntry.findUnique).mockResolvedValue(existing as any)
    vi.mocked(prisma.leaderboardEntry.update).mockResolvedValue(updated as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any)

    const res = await adminIdPut(makeRequest("entry-1", { hidden: true }), {
      params: Promise.resolve({ id: "entry-1" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entry.hidden).toBe(true)
    expect(prisma.leaderboardEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { hidden: true } })
    )
  })

  it("creates a LEADERBOARD_VISIBILITY audit log entry on success", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN") as any)
    const existing = makeEntry()
    vi.mocked(prisma.leaderboardEntry.findUnique).mockResolvedValue(existing as any)
    vi.mocked(prisma.leaderboardEntry.update).mockResolvedValue({ ...existing, hidden: false } as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any)

    await adminIdPut(makeRequest("entry-1", { hidden: false }), {
      params: Promise.resolve({ id: "entry-1" }),
    })

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "LEADERBOARD_VISIBILITY",
          metadata: expect.objectContaining({ entryId: "entry-1", hidden: false }),
        }),
      })
    )
  })
})

// ── GET /api/leaderboard (public) ─────────────────────────────────────────────

describe("GET /api/leaderboard (public)", () => {
  beforeEach(() => vi.resetAllMocks())

  it("queries prisma with hidden=false so hidden candidates are excluded", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([] as any)

    await publicGet(new Request("http://localhost/api/leaderboard"))

    expect(prisma.leaderboardEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hidden: false }),
      })
    )
  })

  it("returns 200 with a leaderboard array", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([makeEntry()] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.leaderboard)).toBe(true)
  })

  it("assigns sequential rank starting at 1", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([
      makeEntry({ id: "e1", userId: "u1" }),
      makeEntry({ id: "e2", userId: "u2" }),
    ] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const { leaderboard } = await res.json()
    expect(leaderboard[0].rank).toBe(1)
    expect(leaderboard[1].rank).toBe(2)
  })

  it("includes gamification fields: xp, level, levelName, tier, rankChange, badges, xpProgress", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([makeEntry({ xp: 600 })] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const { leaderboard } = await res.json()
    const entry = leaderboard[0]
    expect(entry).toHaveProperty("xp", 600)
    expect(entry).toHaveProperty("level")
    expect(entry).toHaveProperty("levelName")
    expect(entry).toHaveProperty("tier")
    expect(entry).toHaveProperty("rankChange")
    expect(entry).toHaveProperty("rankChangeAmount")
    expect(entry).toHaveProperty("badges")
    expect(entry).toHaveProperty("xpProgress")
  })

  it("rankChange is 'new' for entries with no previousRank", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([
      makeEntry({ previousRank: null }),
    ] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const { leaderboard } = await res.json()
    expect(leaderboard[0].rankChange).toBe("new")
    expect(leaderboard[0].rankChangeAmount).toBe(0)
  })

  it("filters by cycleId when ?cycle= param is present", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([] as any)

    await publicGet(new Request("http://localhost/api/leaderboard?cycle=2026-06"))

    expect(prisma.leaderboardEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hidden: false, cycleId: "2026-06" }),
      })
    )
  })

  it("does NOT add cycleId filter when ?cycle= is absent", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([] as any)

    await publicGet(new Request("http://localhost/api/leaderboard"))

    const call = vi.mocked(prisma.leaderboardEntry.findMany).mock.calls[0][0] as any
    expect(call.where).not.toHaveProperty("cycleId")
  })

  it("caps ?limit at 100 even when a larger value is requested", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([] as any)

    await publicGet(new Request("http://localhost/api/leaderboard?limit=500"))

    expect(prisma.leaderboardEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    )
  })

  it("defaults limit to 50 when no ?limit= param is given", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([] as any)

    await publicGet(new Request("http://localhost/api/leaderboard"))

    expect(prisma.leaderboardEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    )
  })

  it("sets currentUserStats when authenticated user appears in the leaderboard", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([
      makeEntry({ userId: "user-1" }),
    ] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const data = await res.json()
    expect(data.currentUserStats).not.toBeNull()
    expect(data.currentUserStats.rank).toBe(1)
    expect(data.currentUserStats).toHaveProperty("xp")
    expect(data.currentUserStats).toHaveProperty("level")
    expect(data.currentUserStats).toHaveProperty("badges")
  })

  it("sets currentUserStats to null when user is not in the leaderboard", async () => {
    mockAuth.mockResolvedValue({ user: { id: "ghost-user" } } as any)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([
      makeEntry({ userId: "user-1" }),
    ] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const data = await res.json()
    expect(data.currentUserStats).toBeNull()
  })

  it("sets currentUserStats to null for unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([makeEntry()] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const data = await res.json()
    expect(data.currentUserStats).toBeNull()
  })

  it("parses badges stored as a JSON string on the entry", async () => {
    mockAuth.mockResolvedValue(null)
    const badgeJson = JSON.stringify([{ slug: "first_submission", name: "First Submission", emoji: "🚀" }])
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([
      makeEntry({ badges: badgeJson }),
    ] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const { leaderboard } = await res.json()
    expect(Array.isArray(leaderboard[0].badges)).toBe(true)
    expect(leaderboard[0].badges[0].slug).toBe("first_submission")
  })

  it("handles entries where badges is already an array (not a string)", async () => {
    mockAuth.mockResolvedValue(null)
    vi.mocked(prisma.leaderboardEntry.findMany).mockResolvedValue([
      makeEntry({ badges: [{ slug: "consistent", name: "Consistent", emoji: "🔥" }] }),
    ] as any)

    const res = await publicGet(new Request("http://localhost/api/leaderboard"))
    const { leaderboard } = await res.json()
    expect(leaderboard[0].badges[0].slug).toBe("consistent")
  })
})
