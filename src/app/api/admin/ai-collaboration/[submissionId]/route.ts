import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { analyzeAICollaboration } from "@/lib/ai-collaboration/analyzer"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { submissionId } = await params

    // Fetch the submission with its AI declaration data
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        aiUsageExplanation: true,
        userId: true,
        submittedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedProblem: {
          select: {
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
          select: {
            id: true,
            aiUsageScore: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    // Run the collaboration analysis
    const analysis = analyzeAICollaboration(
      submission.id,
      submission.aiUsageExplanation
    )

    // Include the existing evaluator's aiUsageScore for reference
    const existingAiScore =
      submission.evaluations.length > 0
        ? submission.evaluations[0].aiUsageScore
        : null

    return NextResponse.json({
      analysis,
      metadata: {
        candidateName: submission.user.name,
        candidateEmail: submission.user.email,
        problemTitle: submission.assignedProblem.template.title,
        problemCategory: submission.assignedProblem.template.category,
        problemDifficulty: submission.assignedProblem.template.difficulty,
        submittedAt: submission.submittedAt.toISOString(),
        evaluatorAiUsageScore: existingAiScore,
      },
    })
  } catch (error) {
    console.error("AI Collaboration analysis error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
