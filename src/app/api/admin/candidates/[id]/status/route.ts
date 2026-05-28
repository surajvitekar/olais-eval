import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncLeaderboardEntry } from "@/lib/leaderboard-sync"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  REGISTERED: ["ASSESSMENT_COMPLETED"],
  ASSESSMENT_COMPLETED: ["PROBLEM_ASSIGNED"],
  PROBLEM_ASSIGNED: ["IN_PROGRESS", "SUBMITTED"],
  IN_PROGRESS: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["SELECTED", "REJECTED"],
  REJECTED: [],
  SELECTED: [],
}

// Statuses that should create/update a leaderboard entry
const LEADERBOARD_TRACKED_STATUSES = new Set([
  "SHORTLISTED",
  "SELECTED",
  "SUBMITTED",
  "UNDER_REVIEW",
])

const statusUpdateSchema = z.object({
  status: z.enum([
    "REGISTERED",
    "ASSESSMENT_COMPLETED",
    "PROBLEM_ASSIGNED",
    "IN_PROGRESS",
    "SUBMITTED",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "REJECTED",
    "SELECTED",
  ]),
  reason: z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = statusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Find the candidate
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Can only update candidate status" }, { status: 400 })
    }

    const newStatus = parsed.data.status
    const currentStatus = user.status

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus]
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
          message: `Allowed transitions from ${currentStatus}: ${(allowed || []).join(", ") || "none"}`,
        },
        { status: 400 }
      )
    }

    // Update status
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    })

    // Sync leaderboard if the new status should be tracked
    if (LEADERBOARD_TRACKED_STATUSES.has(newStatus)) {
      await syncLeaderboardEntry(id)
    }

    // Audit: candidate status changed
    await logAudit("candidate.status_change", {
      targetUserId: id,
      fromStatus: currentStatus,
      toStatus: newStatus,
      reason: parsed.data.reason || null,
    }, session.user.id)

    return NextResponse.json({
      message: `Status updated from ${currentStatus} to ${newStatus}`,
      user: updated,
    })
  } catch (error) {
    console.error("Update status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
