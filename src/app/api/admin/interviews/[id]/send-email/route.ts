/**
 * ─── OLAIS EVAL — Interview Email Trigger API ──────────────────────────────
 * POST /api/admin/interviews/[id]/send-email - Trigger email for an interview
 *
 * Email types: schedule, reminder, score-published, reschedule, cancellation
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
import {
  sendInterviewScheduledEmail,
  sendInterviewReminder,
  sendScorePublishedNotification,
  sendInterviewCancellation,
  type InterviewEmailInfo,
} from "@/lib/email/interview"

const sendEmailSchema = z.object({
  type: z.enum(["schedule", "reminder", "score-published", "cancellation", "reschedule"]),
  hoursBefore: z.number().int().positive().optional(),
  cancellationReason: z.string().optional(),
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

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        evaluator: { select: { id: true, name: true, email: true } },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = sendEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { type, hoursBefore, cancellationReason } = parsed.data

    const emailInfo: InterviewEmailInfo = {
      candidateName: interview.candidate.name,
      candidateEmail: interview.candidate.email,
      evaluatorName: interview.evaluator?.name || null,
      scheduledAt: interview.scheduledAt,
      duration: interview.duration,
      timezone: interview.timezone,
      meetingLink: interview.meetingLink,
      notes: interview.notes,
      interviewId: interview.id,
    }

    switch (type) {
      case "schedule":
        await sendInterviewScheduledEmail(emailInfo, interview.evaluator?.email || undefined)
        break
      case "reminder":
        await sendInterviewReminder(emailInfo, hoursBefore || 24)
        break
      case "score-published":
        await sendScorePublishedNotification(interview.candidate.name, interview.candidate.email)
        break
      case "cancellation":
        await sendInterviewCancellation(interview.candidate.email, interview.candidate.name, cancellationReason || null)
        break
      case "reschedule":
        await sendInterviewScheduledEmail(emailInfo, interview.evaluator?.email || undefined)
        break
    }

    return NextResponse.json({ success: true, type, sentTo: interview.candidate.email })
  } catch (error) {
    console.error("Send interview email error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
