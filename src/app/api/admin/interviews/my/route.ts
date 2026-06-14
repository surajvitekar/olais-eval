/**
 * ─── OLAIS EVAL — Evaluator Dashboard API ───────────────────────────────────
 * GET /api/admin/interviews/my - List interviews assigned to current evaluator
 *
 * Returns upcoming and past interviews for the logged-in evaluator,
 * including candidate info and skill profile summaries.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"

export async function GET() {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const userId = session.user.id

    // Find interviews where this user is either the primary evaluator or in interviewEvaluators
    const interviews = await prisma.interview.findMany({
      where: {
        OR: [
          { evaluatorId: userId },
          { interviewEvaluators: { some: { userId } } },
        ],
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            skillProfiles: {
              orderBy: { generatedAt: "desc" },
              take: 1,
              select: { scores: true, topSkills: true },
            },
          },
        },
        evaluator: {
          select: { id: true, name: true, email: true },
        },
        interviewEvaluators: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    // Split into upcoming and past
    const now = new Date()
    const upcoming = interviews.filter(
      (iv) => iv.status === "SCHEDULED" && new Date(iv.scheduledAt) >= now
    )
    const past = interviews.filter(
      (iv) => iv.status !== "SCHEDULED" || new Date(iv.scheduledAt) < now
    )

    return NextResponse.json({
      upcoming,
      past,
      totalUpcoming: upcoming.length,
      totalPast: past.length,
    })
  } catch (error) {
    console.error("Evaluator dashboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
