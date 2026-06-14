/**
 * ─── OLAIS EVAL — Interview Draft Notes API ────────────────────────────────
 * POST  /api/admin/interviews/[id]/draft  - Save/load scoring draft
 * GET   /api/admin/interviews/[id]/draft  - Get saved draft
 *
 * Auto-saves evaluator's work in progress — survives browser crash/close.
 * Auth-protected: requires EVALUATE_SUBMISSIONS permission.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import { z } from "zod"

// ── Validation Schema ──────────────────────────────────────────────────────

const saveDraftSchema = z.object({
  scores: z.record(z.string(), z.number().int().min(0).max(100)).optional(),
  notes: z.string().max(5000).optional(),
})

// ── POST: Save draft ───────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.EVALUATE_SUBMISSIONS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = saveDraftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { scores, notes } = parsed.data

    // Upsert draft — create or update
    const draft = await prisma.interviewDraft.upsert({
      where: {
        interviewId_evaluatorId: {
          interviewId: id,
          evaluatorId: session.user.id,
        },
      },
      create: {
        interviewId: id,
        evaluatorId: session.user.id,
        scores: scores ?? {},
        notes: notes ?? "",
      },
      update: {
        ...(scores !== undefined ? { scores } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    })

    return NextResponse.json({
      savedAt: draft.savedAt,
    })
  } catch (error) {
    console.error("Save draft error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── GET: Get saved draft ───────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.EVALUATE_SUBMISSIONS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const draft = await prisma.interviewDraft.findUnique({
      where: {
        interviewId_evaluatorId: {
          interviewId: id,
          evaluatorId: session.user.id,
        },
      },
    })

    if (!draft) {
      return NextResponse.json({ draft: null })
    }

    return NextResponse.json({
      draft: {
        scores: draft.scores,
        notes: draft.notes,
        savedAt: draft.savedAt,
      },
    })
  } catch (error) {
    console.error("Get draft error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
