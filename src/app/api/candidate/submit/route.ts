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
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { assignedProblemId, gitUrl, liveUrl, architectureNotes, aiUsageExplanation } = parsed.data

    // Verify the assigned problem belongs to this user
    const assignedProblem = await prisma.assignedProblem.findFirst({
      where: {
        id: assignedProblemId,
        userId: session.user.id,
      },
    })

    if (!assignedProblem) {
      return NextResponse.json(
        { error: "Assigned problem not found" },
        { status: 404 }
      )
    }

    if (assignedProblem.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "This problem has already been submitted" },
        { status: 400 }
      )
    }

    // Get elapsed seconds from request or compute
    const elapsedSeconds = body.elapsedSeconds ?? null

    // Create submission, update assigned problem, and leaderboard
    const result = await prisma.$transaction(async (tx) => {
      // Create submission
      const submission = await tx.submission.create({
        data: {
          userId: session.user.id,
          assignedProblemId,
          gitUrl,
          liveUrl: liveUrl ?? null,
          architectureNotes,
          aiUsageExplanation,
          screenshots: [],
          elapsedSeconds,
        },
      })

      // Update assigned problem status
      await tx.assignedProblem.update({
        where: { id: assignedProblemId },
        data: { status: "SUBMITTED" },
      })

      // Check if all assigned problems are submitted
      const remaining = await tx.assignedProblem.count({
        where: {
          userId: session.user.id,
          status: { not: "SUBMITTED" },
        },
      })

      if (remaining === 0) {
        await tx.user.update({
          where: { id: session.user.id },
          data: { status: "SUBMITTED" },
        })
      }

      // Update or create leaderboard entry
      const existingEntry = await tx.leaderboardEntry.findUnique({
        where: {
          userId_cycleId: {
            userId: session.user.id,
            cycleId: "default",
          },
        },
      })

      if (existingEntry) {
        await tx.leaderboardEntry.update({
          where: { id: existingEntry.id },
          data: {
            submissionCount: { increment: 1 },
            fastestTime: existingEntry.fastestTime
              ? Math.min(existingEntry.fastestTime, elapsedSeconds ?? 999999)
              : elapsedSeconds,
          },
        })
      } else {
        await tx.leaderboardEntry.create({
          data: {
            userId: session.user.id,
            cycleId: "default",
            submissionCount: 1,
            fastestTime: elapsedSeconds,
          },
        })
      }

      return submission
    })

    // Audit: submission created
    await logAudit("submission.create", {
      submissionId: result.id,
      assignedProblemId,
      gitUrl,
      elapsedSeconds,
    }, session.user.id)

    return NextResponse.json({
      message: "Submission successful",
      submission: {
        id: result.id,
        submittedAt: result.submittedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Submit error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
