/**
 * ─── OLAIS EVAL — Candidate Interview View API ──────────────────────────────
 * GET /api/candidate/interviews - List the current candidate's scheduled interviews
 *
 * Auth-protected: requires a valid candidate session.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ── GET: List candidate's interviews ────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow candidates to view their own interviews, and admins to view any
    const url = new URL(request.url)
    const targetUserId = session.user.role === "CANDIDATE"
      ? session.user.id
      : (url.searchParams.get("userId") ?? session.user.id)

    const status = url.searchParams.get("status") ?? ""
    const fromDate = url.searchParams.get("from") ?? ""
    const toDate = url.searchParams.get("to") ?? ""

    const where: Record<string, unknown> = {
      candidateId: targetUserId,
    }

    if (status) {
      where.status = status
    }
    if (fromDate || toDate) {
      const scheduledAtFilter: Record<string, Date> = {}
      if (fromDate) scheduledAtFilter.gte = new Date(fromDate)
      if (toDate) scheduledAtFilter.lte = new Date(toDate)
      where.scheduledAt = scheduledAtFilter
    }

    const interviews = await prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        timezone: true,
        status: true,
        notes: true,
        meetingLink: true,
        createdAt: true,
        evaluator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ interviews })
  } catch (error) {
    console.error("List candidate interviews error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
