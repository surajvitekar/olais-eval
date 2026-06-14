import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAIReport } from "@/lib/ai-collaboration/report"
import type { AIReportInput } from "@/lib/ai-collaboration/report"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { submissionId } = await params

    // Fetch submission with all needed relations
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedProblem: {
          include: {
            template: {
              select: {
                title: true,
                slug: true,
                category: true,
                difficulty: true,
              },
            },
          },
        },
        evaluations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            aiUsageScore: true,
            executionScore: true,
            thoughtProcessScore: true,
            architectureScore: true,
            communicationScore: true,
            totalScore: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // Authorization: the candidate can only see their own reports
    if (session.user.id !== submission.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Build the report input
    const reportInput: AIReportInput = {
      user: submission.user,
      template: submission.assignedProblem.template,
      submission: {
        id: submission.id,
        aiUsageExplanation: submission.aiUsageExplanation,
        architectureNotes: submission.architectureNotes,
        submittedAt: submission.submittedAt,
        elapsedSeconds: submission.elapsedSeconds,
      },
      evaluation: submission.evaluations[0] ?? null,
    }

    const report = generateAIReport(reportInput)

    return NextResponse.json({ report })
  } catch (error) {
    console.error("Get AI report error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
