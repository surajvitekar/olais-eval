/**
 * ─── OLAIS EVAL — Interview Evaluator Management API ────────────────────────
 * POST   /api/admin/interviews/[id]/evaluators - Add evaluator to interview
 * GET    /api/admin/interviews/[id]/evaluators - List evaluators for interview
 * DELETE /api/admin/interviews/[id]/evaluators - Remove evaluator from interview
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

const addEvaluatorSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["EVALUATOR", "LEAD", "SHADOW"]).default("EVALUATOR"),
})

export async function POST(
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

    const interview = await prisma.interview.findUnique({ where: { id } })
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = addEvaluatorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId, role } = parsed.data

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role === "CANDIDATE") {
      return NextResponse.json({ error: "Invalid evaluator user" }, { status: 400 })
    }

    // Check not already assigned
    const existing = await prisma.interviewEvaluator.findUnique({
      where: { interviewId_userId: { interviewId: id, userId } },
    })
    if (existing) {
      // Update role instead
      const updated = await prisma.interviewEvaluator.update({
        where: { id: existing.id },
        data: { role },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
      return NextResponse.json(updated)
    }

    const evaluator = await prisma.interviewEvaluator.create({
      data: { interviewId: id, userId, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(evaluator, { status: 201 })
  } catch (error) {
    console.error("Add evaluator error:", error)
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

    const evaluators = await prisma.interviewEvaluator.findMany({
      where: { interviewId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ evaluators })
  } catch (error) {
    console.error("List evaluators error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
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

    const url = new URL(request.url)
    const evaluatorId = url.searchParams.get("evaluatorId")
    if (!evaluatorId) {
      return NextResponse.json({ error: "evaluatorId query param required" }, { status: 400 })
    }

    const existing = await prisma.interviewEvaluator.findUnique({
      where: { interviewId_userId: { interviewId: id, userId: evaluatorId } },
    })
    if (!existing) {
      return NextResponse.json({ error: "Evaluator not found for this interview" }, { status: 404 })
    }

    // Prevent removing the last LEAD evaluator
    if (existing.role === "LEAD") {
      const leadCount = await prisma.interviewEvaluator.count({
        where: { interviewId: id, role: "LEAD" },
      })
      if (leadCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last lead evaluator. Assign another lead first." },
          { status: 400 }
        )
      }
    }

    await prisma.interviewEvaluator.delete({ where: { id: existing.id } })
    return NextResponse.json({ message: "Evaluator removed" })
  } catch (error) {
    console.error("Remove evaluator error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
