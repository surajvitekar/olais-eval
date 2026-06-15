/**
 * ─── OLAIS EVAL — Interview Scoring API ──────────────────────────────────────
 * PUT    /api/admin/interviews/[id]/score   - Submit scores for an interview
 * GET    /api/admin/interviews/[id]/score   - Get current score data
 *
 * Supports both legacy (hardcoded 4-dimension) and dynamic (ScoringDimension)
 * scoring modes. Legacy mode continues to work for backward compatibility.
 *
 * Auth-protected: requires ADMIN, REVIEWER, or HIRING_MANAGER role.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

// ── Validation Schemas ─────────────────────────────────────────────────────

const legacyScoreSchema = z.object({
  problemSolving: z.number().int().min(0).max(100).optional(),
  techSkills: z.number().int().min(0).max(100).optional(),
  communication: z.number().int().min(0).max(100).optional(),
  culturalFit: z.number().int().min(0).max(100).optional(),
  evaluatorNotes: z.string().max(2000).optional(),
})

const dimensionScoreSchema = z.object({
  dimensionScores: z
    .array(
      z.object({
        dimensionId: z.string().min(1),
        score: z.number().int().min(0).max(100),
        notes: z.string().max(1000).optional(),
      })
    )
    .min(1),
  evaluatorNotes: z.string().max(2000).optional(),
})

// ── Helpers ────────────────────────────────────────────────────────────────

function calculateOverall(
  scores: number[]
): number | null {
  if (scores.length === 0) return null
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100
}

function isLegacyBody(body: Record<string, unknown>): boolean {
  return (
    "problemSolving" in body ||
    "techSkills" in body ||
    "communication" in body ||
    "culturalFit" in body
  )
}

// ── PUT: Submit Scores ─────────────────────────────────────────────────────

export async function PUT(
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

    // Check interview exists and is SCHEDULED or COMPLETED
    const existing = await prisma.interview.findUnique({
      where: { id },
      select: { id: true, status: true, candidateId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    if (existing.status !== "SCHEDULED" && existing.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only score SCHEDULED or COMPLETED interviews" },
        { status: 400 }
      )
    }

    // Branch: legacy vs dynamic scoring
    if (isLegacyBody(body)) {
      return handleLegacyScoring(id, existing, body, session.user.id)
    } else {
      return handleDynamicScoring(id, existing, body, session.user.id)
    }
  } catch (error) {
    console.error("Submit score error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── Legacy Scoring (hardcoded 4 dimensions) ────────────────────────────────

async function handleLegacyScoring(
  id: string,
  existing: { id: string; status: string; candidateId: string },
  body: Record<string, unknown>,
  userId: string
) {
  const parsed = legacyScoreSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { problemSolving, techSkills, communication, culturalFit, evaluatorNotes } = parsed.data

  if (
    problemSolving === undefined &&
    techSkills === undefined &&
    communication === undefined &&
    culturalFit === undefined
  ) {
    return NextResponse.json(
      { error: "At least one score dimension is required" },
      { status: 400 }
    )
  }

  const scores = [problemSolving, techSkills, communication, culturalFit].filter(
    (s): s is number => s !== undefined
  )
  const overallScore = calculateOverall(scores)

  const updateData: Record<string, unknown> = {
    status: "COMPLETED",
    scoredAt: new Date(),
    overallScore,
  }
  if (problemSolving !== undefined) updateData.problemSolving = problemSolving
  if (techSkills !== undefined) updateData.techSkills = techSkills
  if (communication !== undefined) updateData.communication = communication
  if (culturalFit !== undefined) updateData.culturalFit = culturalFit
  if (evaluatorNotes !== undefined) updateData.evaluatorNotes = evaluatorNotes

  const interview = await prisma.interview.update({
    where: { id },
    data: updateData,
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      evaluator: { select: { id: true, name: true, email: true } },
    },
  })

  await updateLeaderboardEntry(existing.candidateId, overallScore)

  await logAudit("interview.scored", {
    interviewId: id,
    mode: "legacy",
    overallScore,
    evaluatorId: userId,
  }, userId)

  return NextResponse.json(interview)
}

// ── Dynamic Scoring (configurable dimensions) ──────────────────────────────

async function handleDynamicScoring(
  id: string,
  existing: { id: string; status: string; candidateId: string },
  body: Record<string, unknown>,
  userId: string
) {
  const parsed = dimensionScoreSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { dimensionScores, evaluatorNotes } = parsed.data

  // Verify all dimension IDs exist and are active, get their weights
  const dimensionIds = dimensionScores.map((d) => d.dimensionId)
  const dimensions = await prisma.scoringDimension.findMany({
    where: { id: { in: dimensionIds }, isActive: true },
  })

  if (dimensions.length !== dimensionIds.length) {
    return NextResponse.json(
      { error: "One or more scoring dimensions are invalid or inactive" },
      { status: 400 }
    )
  }

  // Upsert each dimension score
  const weightedSum = dimensions.reduce((sum, dim) => {
    const entry = dimensionScores.find((d) => d.dimensionId === dim.id)
    return sum + (entry?.score ?? 0) * dim.weight
  }, 0)

  const totalWeight = dimensions.reduce((sum, dim) => sum + dim.weight, 0)
  const overallScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : null

  // Upsert InterviewScore records for each dimension
  for (const entry of dimensionScores) {
    await prisma.interviewScore.upsert({
      where: {
        interviewId_evaluatorId_dimensionId: {
          interviewId: id,
          evaluatorId: userId,
          dimensionId: entry.dimensionId,
        },
      },
      create: {
        interviewId: id,
        evaluatorId: userId,
        dimensionId: entry.dimensionId,
        score: entry.score,
        notes: entry.notes ?? null,
      },
      update: {
        score: entry.score,
        notes: entry.notes ?? null,
      },
    })
  }

  // Mark interview as completed and set overall score
  const interview = await prisma.interview.update({
    where: { id },
    data: {
      status: "COMPLETED",
      scoredAt: new Date(),
      overallScore,
      evaluatorNotes: evaluatorNotes ?? undefined,
    },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      evaluator: { select: { id: true, name: true, email: true } },
    },
  })

  // Update leaderboard with average of ALL evaluator scores for this interview
  const allScores = await prisma.interviewScore.findMany({
    where: { interviewId: id },
    select: { score: true },
  })

  const avgScore =
    allScores.length > 0
      ? Math.round(
          (allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length) *
            100
        ) / 100
      : overallScore

  await updateLeaderboardEntry(existing.candidateId, avgScore)

  await logAudit("interview.scored", {
    interviewId: id,
    mode: "dynamic",
    overallScore,
    dimensionCount: dimensionScores.length,
    evaluatorId: userId,
  }, userId)

  return NextResponse.json(interview)
}

// ── Leaderboard Helper ─────────────────────────────────────────────────────

async function updateLeaderboardEntry(candidateId: string, score: number | null) {
  const existingEntry = await prisma.leaderboardEntry.findFirst({
    where: { userId: candidateId },
    orderBy: { id: "asc" },
  })

  const evalScore = existingEntry?.evaluationScore ?? null

  // combinedScore = evaluationScore * 0.5 + interviewScore * 0.5
  const combinedScore =
    evalScore !== null && score !== null
      ? Math.round((evalScore * 0.5 + score * 0.5) * 100) / 100
      : score ?? evalScore

  if (existingEntry) {
    await prisma.leaderboardEntry.update({
      where: { id: existingEntry.id },
      data: { interviewScore: score, combinedScore },
    })
  } else {
    const anyCycle = await prisma.leaderboardEntry.findFirst({
      select: { cycleId: true },
      orderBy: { id: "asc" },
    })

    await prisma.leaderboardEntry.create({
      data: {
        userId: candidateId,
        cycleId: anyCycle?.cycleId ?? "default",
        interviewScore: score,
        combinedScore,
        status: "active",
      },
    })
  }
}

// ── GET: Get Interview Score ───────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get legacy fields + new dynamic scores
    const interview = await prisma.interview.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        problemSolving: true,
        techSkills: true,
        communication: true,
        culturalFit: true,
        overallScore: true,
        evaluatorNotes: true,
        scoredAt: true,
        candidate: {
          select: { id: true, name: true, email: true },
        },
        evaluator: {
          select: { id: true, name: true, email: true },
        },
        interviewScores: {
          include: {
            dimension: {
              select: { id: true, name: true, description: true, weight: true, maxScore: true },
            },
            evaluator: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    return NextResponse.json(interview)
  } catch (error) {
    console.error("Get score error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
