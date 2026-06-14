import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const AIO2_API_URL =
  process.env.AIO2_API_URL ||
  "http://host.docker.internal:8000/api/evaluate-submission"

async function callAIO2(submission: any) {
  try {
    const payload = {
      submissionId: submission.id,
      gitUrl: submission.gitUrl,
      liveUrl: submission.liveUrl,
      architectureNotes: submission.architectureNotes,
      aiUsageExplanation: submission.aiUsageExplanation,
      videoUrl: submission.videoUrl,
      screenshots: submission.screenshots,
      elapsedSeconds: submission.elapsedSeconds,
      problem: {
        title: submission.assignedProblem.template.title,
        slug: submission.assignedProblem.template.slug,
        category: submission.assignedProblem.template.category,
        difficulty: submission.assignedProblem.template.difficulty,
        overview: submission.assignedProblem.template.overview,
        requirements: submission.assignedProblem.template.requirements,
        constraints: submission.assignedProblem.template.constraints,
        evaluationCriteria:
          submission.assignedProblem.template.evaluationCriteria,
      },
      candidate: {
        name: submission.user.name,
        email: submission.user.email,
      },
    }

    const res = await fetch(AIO2_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000), // 2 minute timeout
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error")
      throw new Error(`AIO² API error (${res.status}): ${errorText}`)
    }

    return await res.json()
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("AIO² evaluation timed out after 120 seconds")
    }
    throw error
  }
}

// GET: returns current auto-evaluation status for a submission
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

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        userId: true,
        submittedAt: true,
        evaluations: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            totalScore: true,
            executionScore: true,
            thoughtProcessScore: true,
            architectureScore: true,
            uiUxScore: true,
            aiUsageScore: true,
            deploymentScore: true,
            codeOrganizationScore: true,
            communicationScore: true,
            status: true,
            createdAt: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    // Find or create leaderboard entry to check evaluationScore
    const leaderboardEntry = await prisma.leaderboardEntry.findFirst({
      where: { userId: submission.userId },
      orderBy: { id: "desc" },
      select: {
        evaluationScore: true,
        combinedScore: true,
        interviewScore: true,
      },
    })

    return NextResponse.json({
      submissionId: submission.id,
      userId: submission.userId,
      submittedAt: submission.submittedAt.toISOString(),
      evaluation:
        submission.evaluations.length > 0 ? submission.evaluations[0] : null,
      userStatus: submission.user.status,
      leaderboard: leaderboardEntry,
    })
  } catch (error) {
    console.error("Auto-evaluation status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST: triggers AI evaluation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { submissionId } = await params

    // 1. Fetch submission with problem data, user info
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        assignedProblem: {
          include: {
            template: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    // 2. Call AIO² API
    const aiResult = await callAIO2(submission)

    // Extract scores from AI response (flexible format)
    const scores = {
      executionScore: aiResult.executionScore ?? aiResult.scores?.executionScore ?? 0,
      thoughtProcessScore: aiResult.thoughtProcessScore ?? aiResult.scores?.thoughtProcessScore ?? 0,
      architectureScore: aiResult.architectureScore ?? aiResult.scores?.architectureScore ?? 0,
      uiUxScore: aiResult.uiUxScore ?? aiResult.scores?.uiUxScore ?? 0,
      aiUsageScore: aiResult.aiUsageScore ?? aiResult.scores?.aiUsageScore ?? 0,
      deploymentScore: aiResult.deploymentScore ?? aiResult.scores?.deploymentScore ?? 0,
      codeOrganizationScore: aiResult.codeOrganizationScore ?? aiResult.scores?.codeOrganizationScore ?? 0,
      communicationScore: aiResult.communicationScore ?? aiResult.scores?.communicationScore ?? 0,
    }

    const totalScore =
      aiResult.totalScore ??
      aiResult.scores?.totalScore ??
      Object.values(scores).reduce((sum, s) => sum + s, 0) / Object.keys(scores).length

    const aiNotes = aiResult.notes ?? aiResult.feedback ?? aiResult.summary ?? null

    // 3. Create Evaluation record with AI scores
    const evaluation = await prisma.evaluation.create({
      data: {
        submissionId: submission.id,
        evaluatorId: session.user.id,
        executionScore: Math.round(scores.executionScore),
        thoughtProcessScore: Math.round(scores.thoughtProcessScore),
        architectureScore: Math.round(scores.architectureScore),
        uiUxScore: Math.round(scores.uiUxScore),
        aiUsageScore: Math.round(scores.aiUsageScore),
        deploymentScore: Math.round(scores.deploymentScore),
        codeOrganizationScore: Math.round(scores.codeOrganizationScore),
        communicationScore: Math.round(scores.communicationScore),
        totalScore: Math.round(totalScore * 100) / 100,
        notes: aiNotes ? String(aiNotes) : null,
        status: "COMPLETED",
      },
    })

    // 4. Update leaderboard_entry.evaluationScore and combinedScore
    const existingEntry = await prisma.leaderboardEntry.findFirst({
      where: { userId: submission.userId },
      orderBy: { id: "desc" },
    })

    if (existingEntry) {
      const interviewScore = existingEntry.interviewScore ?? 0
      const evaluationScore = Math.round(totalScore * 100) / 100
      const combinedScore = Math.round(
        (evaluationScore * 0.6 + interviewScore * 0.4) * 100
      ) / 100

      await prisma.leaderboardEntry.update({
        where: { id: existingEntry.id },
        data: {
          evaluationScore,
          combinedScore,
        },
      })
    }

    // 5. Update user status to UNDER_REVIEW
    await prisma.user.update({
      where: { id: submission.user.id },
      data: {
        status: "UNDER_REVIEW",
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "AUTO_EVALUATION",
        metadata: {
          submissionId: submission.id,
          evaluationId: evaluation.id,
          totalScore,
          candidateId: submission.user.id,
          candidateName: submission.user.name,
          candidateEmail: submission.user.email,
        },
      },
    })

    // 6. Return evaluation result
    return NextResponse.json({
      success: true,
      evaluation: {
        id: evaluation.id,
        totalScore: evaluation.totalScore,
        scores: {
          executionScore: evaluation.executionScore,
          thoughtProcessScore: evaluation.thoughtProcessScore,
          architectureScore: evaluation.architectureScore,
          uiUxScore: evaluation.uiUxScore,
          aiUsageScore: evaluation.aiUsageScore,
          deploymentScore: evaluation.deploymentScore,
          codeOrganizationScore: evaluation.codeOrganizationScore,
          communicationScore: evaluation.communicationScore,
        },
        notes: evaluation.notes,
        status: evaluation.status,
        createdAt: evaluation.createdAt.toISOString(),
      },
      candidateStatus: "UNDER_REVIEW",
    })
  } catch (error) {
    console.error("Auto-evaluation error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
