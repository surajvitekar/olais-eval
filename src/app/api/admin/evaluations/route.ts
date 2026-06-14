import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logAudit } from "@/lib/audit"
import { calculateCompositeScore, getDefaultWeights } from "@/lib/evaluations/scoring"
import type { DimensionKey, DimensionWeights } from "@/lib/evaluations/scoring"

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
  totalScore: z.number().min(0).max(100).optional(),
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

    // Auto-calculate composite score if not provided
    let totalScore = data.totalScore
    if (totalScore === undefined || totalScore === null) {
      const activeConfig = await prisma.evaluationConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      })
      const weights: DimensionWeights = activeConfig
        ? (activeConfig.dimensionWeights as unknown as DimensionWeights)
        : getDefaultWeights()
      totalScore = calculateCompositeScore(
        {
          executionScore: data.executionScore,
          architectureScore: data.architectureScore,
          thoughtProcessScore: data.thoughtProcessScore,
          aiUsageScore: data.aiUsageScore,
          deploymentScore: data.deploymentScore,
          codeOrganizationScore: data.codeOrganizationScore,
          uiUxScore: data.uiUxScore,
          communicationScore: data.communicationScore,
        },
        weights
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
        totalScore,
        notes: data.notes ?? null,
        status: "COMPLETED",
      },
    })

    // Audit: evaluation created
    await logAudit("evaluation.create", {
      evaluationId: evaluation.id,
      submissionId: data.submissionId,
      totalScore,
    }, session.user.id)

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
    const status = url.searchParams.get("status") // "PENDING" | "COMPLETED" | "all"
    const includePendingSubmissions = url.searchParams.get("includePendingSubmissions") === "true"

    const where: Record<string, unknown> = {}
    if (submissionId) where.submissionId = submissionId
    if (userId) where.evaluatorId = userId
    if (status && status !== "all") where.status = status

    // If we want pending submissions (submissions without evaluations), fetch those too
    const [evaluations, activeConfig, pendingSubmissions] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          submission: {
            select: {
              id: true,
              userId: true,
              assignedProblemId: true,
              submittedAt: true,
              user: { select: { id: true, name: true, email: true } },
              assignedProblem: {
                select: {
                  template: { select: { title: true, slug: true } },
                },
              },
            },
          },
          evaluator: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.evaluationConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      includePendingSubmissions
        ? prisma.submission.findMany({
            where: {
              evaluations: { none: {} },
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
              assignedProblem: {
                select: {
                  template: { select: { title: true, slug: true, category: true } },
                },
              },
            },
            orderBy: { submittedAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
    ])

    // Get weights from active config or use defaults
    const weights = activeConfig
      ? (activeConfig.dimensionWeights as Record<string, number>)
      : getDefaultWeights()

    const passingScore = activeConfig?.passingScore ?? 60

    return NextResponse.json({
      evaluations,
      weights,
      passingScore,
      config: activeConfig
        ? {
            id: activeConfig.id,
            name: activeConfig.name,
            passingScore: activeConfig.passingScore,
          }
        : null,
      pendingSubmissions: pendingSubmissions.map((s) => ({
        id: s.id,
        candidateName: s.user.name || s.user.email,
        candidateId: s.user.id,
        problemTitle: s.assignedProblem.template.title,
        problemSlug: s.assignedProblem.template.slug,
        category: s.assignedProblem.template.category,
        submittedAt: s.submittedAt,
      })),
    })
  } catch (error) {
    console.error("List evaluations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
