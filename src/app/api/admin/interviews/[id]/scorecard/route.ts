/**
 * ─── OLAIS EVAL — Interview Scorecard API ─────────────────────────────────────
 * GET  /api/admin/interviews/[id]/scorecard
 *
 * Returns a structured InterviewScorecard for the given interview, including
 * weighted overall score, per-dimension breakdowns, verdict, strengths, gaps,
 * and AI capability flag.
 *
 * Auth: requires ADMIN, REVIEWER, or HIRING_MANAGER role.
 *   – ADMIN / REVIEWER → covered by EVALUATE_SUBMISSIONS permission
 *   – HIRING_MANAGER   → covered by MANAGE_CANDIDATES permission
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasAnyPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import { generateScorecard } from "@/lib/ai-collaboration/scorecard"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ── Auth check ────────────────────────────────────────────────────────────
    const session = await auth()
    if (
      !session?.user ||
      !hasAnyPermission(session.user.role as UserRole, [
        Permission.EVALUATE_SUBMISSIONS, // ADMIN, REVIEWER
        Permission.MANAGE_CANDIDATES,    // HIRING_MANAGER
      ])
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // ── Generate scorecard ────────────────────────────────────────────────────
    const scorecard = await generateScorecard(id)
    return NextResponse.json(scorecard)
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Interview not found" ||
        error.message === "Interview has no scores"
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }
    console.error("Scorecard generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
