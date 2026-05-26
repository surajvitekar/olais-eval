import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const evaluationCreateSchema = z.object({
  submissionId: z.string().min(1),
  executionScore: z.number().int().min(1).max(10),
  architectureScore: z.number().int().min(1).max(10),
  thoughtProcessScore: z.number().int().min(1).max(10),
  aiUsageScore: z.number().int().min(1).max(10),
  deploymentScore: z.number().int().min(1).max(10),
  codeOrganizationScore: z.number().int().min(1).max(10),
  uiUxScore: z.number().int().min(1).max(10),
  communicationScore: z.number().int().min(1).max(10),
  totalScore: z.number().min(0).max(100),
  notes: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = evaluationCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify submission exists
    const submission = await prisma.submission.findUnique({
      where: { id: data.submissionId },
      include: {
        evaluations: true,
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // Check if evaluation already exists for this submission by this evaluator
    const existing = submission.evaluations.find(
      (e) => e.evaluatorId === session.user.id
    )
    if (existing) {
      return NextResponse.json(
        { error: "You have already evaluated this submission. Use PUT to update." },
        { status: 409 }
      )
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        submissionId: data.submissionId,
        evaluatorId: session.user.id,
        executionScore: data.executionScore,
        architectureScore: data.architectureScore,
        thoughtProcessScore: data.thoughtProcessScore,
        aiUsageScore: data.aiUsageScore,
        deploymentScore: data.deploymentScore,
        codeOrganizationScore: data.codeOrganizationScore,
        uiUxScore: data.uiUxScore,
        communicationScore: data.communicationScore,
        totalScore: data.totalScore,
        notes: data.notes ?? null,
        status: "COMPLETED",
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EVALUATION_CREATED",
        metadata: {
          evaluationId: evaluation.id,
          submissionId: data.submissionId,
          totalScore: data.totalScore,
        },
      },
    })

    return NextResponse.json({ evaluation }, { status: 201 })
  } catch (error) {
    console.error("Create evaluation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const submissionId = url.searchParams.get("submissionId")
    const userId = url.searchParams.get("userId")

    const where: Record<string, unknown> = {}
    if (submissionId) where.submissionId = submissionId
    if (userId) where.evaluatorId = userId

    const evaluations = await prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        submission: {
          select: {
            id: true,
            userId: true,
            assignedProblemId: true,
            submittedAt: true,
          },
        },
        evaluator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ evaluations })
  } catch (error) {
    console.error("List evaluations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
