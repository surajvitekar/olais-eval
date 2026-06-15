import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const submitSchema = z.object({
  assignedProblemId: z.string().min(1),
  gitUrl: z.string().url("Invalid git URL").or(z.string().startsWith("git@")),
  liveUrl: z.string().url().nullable().optional(),
  architectureNotes: z.string().min(10, "Architecture notes must be at least 10 characters"),
  aiUsageExplanation: z.string().min(1, "AI usage declaration is required"),
  videoUrl: z.string().url().nullable().optional(),
  screenshots: z.array(z.string()).optional().default([]),
  elapsedSeconds: z.number().int().nonnegative().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      assignedProblemId,
      gitUrl,
      liveUrl,
      architectureNotes,
      aiUsageExplanation,
      videoUrl,
      screenshots,
      elapsedSeconds,
    } = parsed.data

    const userId = session.user.id

    // Verify this problem belongs to this candidate
    const assignedProblem = await prisma.assignedProblem.findFirst({
      where: { id: assignedProblemId, userId },
    })
    if (!assignedProblem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 })
    }

    // Enforce deadline — reject late submissions
    if (assignedProblem.deadline && new Date() > assignedProblem.deadline) {
      await logAudit("submission.rejected_late", { assignedProblemId }, userId)
      return NextResponse.json(
        { error: "Submission deadline has passed", code: "DEADLINE_EXCEEDED" },
        { status: 422 }
      )
    }

    // Reject duplicate submissions
    const existing = await prisma.submission.findUnique({
      where: { userId_assignedProblemId: { userId, assignedProblemId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted this problem", code: "DUPLICATE_SUBMISSION" },
        { status: 409 }
      )
    }

    // Create submission and advance user status in a single transaction
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.create({
        data: {
          userId,
          assignedProblemId,
          gitUrl,
          liveUrl: liveUrl ?? null,
          architectureNotes,
          aiUsageExplanation,
          videoUrl: videoUrl ?? null,
          screenshots: screenshots ?? [],
          elapsedSeconds: elapsedSeconds ?? null,
        },
      })

      await tx.assignedProblem.update({
        where: { id: assignedProblemId },
        data: { status: "SUBMITTED" },
      })

      await tx.user.update({
        where: { id: userId },
        data: { status: "SUBMITTED" },
      })

      return sub
    })

    await logAudit("submission.created", { submissionId: submission.id, assignedProblemId }, userId)

    return NextResponse.json(
      { success: true, submissionId: submission.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Submit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
