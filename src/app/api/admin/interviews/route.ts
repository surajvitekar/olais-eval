/**
 * ─── OLAIS EVAL — Admin Interview Scheduling API ────────────────────────────
 * POST   /api/admin/interviews       - Create a new interview slot
 * GET    /api/admin/interviews       - List all scheduled interviews (with filters)
 * DELETE /api/admin/interviews       - Cancel an interview (requires id param)
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

// ── Validation Schemas ──────────────────────────────────────────────────────

const createInterviewSchema = z.object({
  candidateId: z.string().min(1, "Candidate is required"),
  evaluatorId: z.string().optional(),
  scheduledAt: z.string().min(1, "Scheduled date/time is required"),
  duration: z.number().int().min(15).max(480).default(60),
  timezone: z.string().default("UTC"),
  notes: z.string().optional(),
  meetingLink: z.string().optional(),
})

const cancelInterviewSchema = z.object({
  id: z.string().min(1, "Interview ID is required"),
})

// ── Shared includes ─────────────────────────────────────────────────────────

const interviewIncludes = {
  candidate: { select: { id: true, name: true, email: true } },
  evaluator: { select: { id: true, name: true, email: true } },
  interviewEvaluators: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
} as const

// ── POST: Create Interview ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_CANDIDATES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createInterviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { candidateId, evaluatorId, scheduledAt, duration, timezone, notes, meetingLink } = parsed.data

    // Verify candidate exists and is a CANDIDATE role
    const candidate = await prisma.user.findUnique({
      where: { id: candidateId },
      select: { id: true, role: true, status: true },
    })
    if (!candidate || candidate.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Invalid candidate" }, { status: 400 })
    }

    // If evaluatorId provided, verify user exists and has appropriate role
    const effectiveEvaluatorId = evaluatorId || session.user.id
    if (evaluatorId) {
      const evaluator = await prisma.user.findUnique({
        where: { id: evaluatorId },
        select: { id: true, role: true },
      })
      if (!evaluator || evaluator.role === "CANDIDATE") {
        return NextResponse.json({ error: "Invalid evaluator" }, { status: 400 })
      }
    }

    const interview = await prisma.interview.create({
      data: {
        candidateId,
        evaluatorId: effectiveEvaluatorId,
        scheduledAt: new Date(scheduledAt),
        duration,
        timezone,
        notes: notes || null,
        meetingLink: meetingLink || null,
        status: "SCHEDULED",
        interviewEvaluators: {
          create: {
            userId: effectiveEvaluatorId,
            role: "LEAD",
          },
        },
      },
      include: interviewIncludes,
    })

    // Auto-advance candidate status to UNDER_REVIEW when interview is scheduled
    if (candidate.status === "SUBMITTED" || candidate.status === "ASSESSMENT_COMPLETED") {
      await prisma.user.update({
        where: { id: candidateId },
        data: { status: "UNDER_REVIEW" },
      })
    }

    return NextResponse.json(interview, { status: 201 })
  } catch (error) {
    console.error("Create interview error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── GET: List Interviews ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status") ?? ""
    const candidateId = url.searchParams.get("candidateId") ?? ""
    const evaluatorId = url.searchParams.get("evaluatorId") ?? ""
    const fromDate = url.searchParams.get("from") ?? ""
    const toDate = url.searchParams.get("to") ?? ""
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")))

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (candidateId) {
      where.candidateId = candidateId
    }
    if (evaluatorId) {
      where.interviewEvaluators = {
        some: { userId: evaluatorId },
      }
    }
    if (fromDate || toDate) {
      const scheduledAtFilter: Record<string, Date> = {}
      if (fromDate) scheduledAtFilter.gte = new Date(fromDate)
      if (toDate) scheduledAtFilter.lte = new Date(toDate)
      where.scheduledAt = scheduledAtFilter
    }

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: interviewIncludes,
      }),
      prisma.interview.count({ where }),
    ])

    return NextResponse.json({
      interviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("List interviews error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── DELETE: Cancel Interview ────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_CANDIDATES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      )
    }

    const existing = await prisma.interview.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      )
    }

    if (existing.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Can only cancel SCHEDULED interviews" },
        { status: 400 }
      )
    }

    await prisma.interview.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ message: "Interview cancelled" })
  } catch (error) {
    console.error("Cancel interview error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
