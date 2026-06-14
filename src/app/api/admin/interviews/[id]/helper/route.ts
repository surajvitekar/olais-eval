/**
 * ─── OLAIS EVAL — Interview Helper Data API ────────────────────────────────
 * GET  /api/admin/interviews/[id]/helper  - Get full helper data for evaluator
 *
 * Returns: candidate profile, scoring dimensions, existing/evaluator scores
 * Auth-protected: requires EVALUATE_SUBMISSIONS permission.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"

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

    // Fetch interview with candidate + evaluator info
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            college: true,
            status: true,
            resumeUrl: true,
            githubUrl: true,
            linkedinUrl: true,
            skillProfiles: {
              orderBy: { generatedAt: "desc" },
              take: 1,
              select: { scores: true, topSkills: true },
            },
            evaluations: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { totalScore: true },
            },
          },
        },
        interviewEvaluators: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    // Fetch active scoring dimensions
    const dimensions = await prisma.scoringDimension.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    })

    // Fetch existing scores for this evaluator
    const myScores = await prisma.interviewScore.findMany({
      where: {
        interviewId: id,
        evaluatorId: session.user.id,
      },
    })

    // Fetch draft notes for this evaluator
    const draft = await prisma.interviewDraft.findUnique({
      where: {
        interviewId_evaluatorId: {
          interviewId: id,
          evaluatorId: session.user.id,
        },
      },
    })

    // Build score map: dimensionId -> score
    const scoreMap: Record<string, number> = {}
    for (const s of myScores) {
      scoreMap[s.dimensionId] = s.score
    }

    return NextResponse.json({
      interview: {
        id: interview.id,
        status: interview.status,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        timezone: interview.timezone,
        meetingLink: interview.meetingLink,
        notes: interview.notes,
        evaluatorNotes: interview.evaluatorNotes,
        overallScore: interview.overallScore,
        scoredAt: interview.scoredAt,
      },
      candidate: interview.candidate,
      dimensions,
      myScores: scoreMap,
      draft: draft
        ? {
            scores: draft.scores,
            notes: draft.notes,
            savedAt: draft.savedAt,
          }
        : null,
    })
  } catch (error) {
    console.error("Helper data error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
