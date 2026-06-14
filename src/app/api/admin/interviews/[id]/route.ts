/**
 * ─── OLAIS EVAL — Interview Update API ─────────────────────────────────────
 * PUT /api/admin/interviews/[id] - Update interview details
 * GET /api/admin/interviews/[id] - Get single interview with details
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

const updateInterviewSchema = z.object({
  evaluatorId: z.string().optional(),
  scheduledAt: z.string().optional(),
  duration: z.number().int().min(15).max(480).optional(),
  timezone: z.string().optional(),
  notes: z.string().optional(),
  meetingLink: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
})

const interviewIncludes = {
  candidate: { select: { id: true, name: true, email: true } },
  evaluator: { select: { id: true, name: true, email: true } },
  interviewEvaluators: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
} as const

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_CANDIDATES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const existing = await prisma.interview.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateInterviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const { evaluatorId, scheduledAt, duration, timezone, notes, meetingLink, status } = parsed.data

    if (evaluatorId !== undefined) {
      const evaluator = await prisma.user.findUnique({
        where: { id: evaluatorId },
        select: { id: true, role: true },
      })
      if (!evaluator || evaluator.role === "CANDIDATE") {
        return NextResponse.json({ error: "Invalid evaluator" }, { status: 400 })
      }
      updateData.evaluatorId = evaluatorId

      // Upsert the lead evaluator entry
      await prisma.interviewEvaluator.upsert({
        where: { interviewId_userId: { interviewId: id, userId: evaluatorId } },
        update: { role: "LEAD" },
        create: { interviewId: id, userId: evaluatorId, role: "LEAD" },
      })
    }
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt)
    if (duration !== undefined) updateData.duration = duration
    if (timezone !== undefined) updateData.timezone = timezone
    if (notes !== undefined) updateData.notes = notes
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink
    if (status !== undefined) updateData.status = status

    const interview = await prisma.interview.update({
      where: { id },
      data: updateData,
      include: interviewIncludes,
    })

    return NextResponse.json(interview)
  } catch (error) {
    console.error("Update interview error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        ...interviewIncludes,
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            skillProfiles: { orderBy: { generatedAt: "desc" }, take: 1 },
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    return NextResponse.json(interview)
  } catch (error) {
    console.error("Get interview error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
