import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import {
  calculateCompositeScore,
  getDefaultWeights,
  formatScoreBreakdown,
  getPerformanceLabel,
  type DimensionWeights,
} from "@/lib/evaluations/scoring"

const evaluationUpdateSchema = z.object({
  executionScore: z.number().int().min(1).max(10).optional(),
  architectureScore: z.number().int().min(1).max(10).optional(),
  thoughtProcessScore: z.number().int().min(1).max(10).optional(),
  aiUsageScore: z.number().int().min(1).max(10).optional(),
  deploymentScore: z.number().int().min(1).max(10).optional(),
  codeOrganizationScore: z.number().int().min(1).max(10).optional(),
  uiUxScore: z.number().int().min(1).max(10).optional(),
  communicationScore: z.number().int().min(1).max(10).optional(),
  totalScore: z.number().min(0).max(100).optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        submission: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            assignedProblem: {
              include: {
                template: {
                  select: {
                    title: true,
                    slug: true,
                    category: true,
                    evaluationCriteria: true,
                  },
                },
              },
            },
          },
        },
        evaluator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 })
    }

    // Get active config for weights
    const activeConfig = await prisma.evaluationConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })

    const weights: DimensionWeights = activeConfig
      ? (activeConfig.dimensionWeights as unknown as DimensionWeights)
      : getDefaultWeights()

    const scores = {
      executionScore: evaluation.executionScore,
      architectureScore: evaluation.architectureScore,
      thoughtProcessScore: evaluation.thoughtProcessScore,
      aiUsageScore: evaluation.aiUsageScore,
      deploymentScore: evaluation.deploymentScore,
      codeOrganizationScore: evaluation.codeOrganizationScore,
      uiUxScore: evaluation.uiUxScore,
      communicationScore: evaluation.communicationScore,
    }

    // Calculate breakdown with current weights
    const breakdown = formatScoreBreakdown(scores, weights)
    const performanceLabel = getPerformanceLabel(evaluation.totalScore)

    return NextResponse.json({
      evaluation,
      weights,
      breakdown,
      performanceLabel,
      config: activeConfig
        ? {
            id: activeConfig.id,
            name: activeConfig.name,
            passingScore: activeConfig.passingScore,
          }
        : null,
    })
  } catch (error) {
    console.error("Get evaluation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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
    const parsed = evaluationUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Verify evaluation exists and belongs to this evaluator
    const existing = await prisma.evaluation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 })
    }

    if (existing.evaluatorId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own evaluations" },
        { status: 403 }
      )
    }

    // Auto-calculate composite score if dimension scores changed but totalScore not provided
    let totalScore = parsed.data.totalScore
    const hasDimensionScores =
      parsed.data.executionScore !== undefined ||
      parsed.data.architectureScore !== undefined ||
      parsed.data.thoughtProcessScore !== undefined ||
      parsed.data.aiUsageScore !== undefined ||
      parsed.data.deploymentScore !== undefined ||
      parsed.data.codeOrganizationScore !== undefined ||
      parsed.data.uiUxScore !== undefined ||
      parsed.data.communicationScore !== undefined

    if (totalScore === undefined && hasDimensionScores) {
      const activeConfig = await prisma.evaluationConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      })
      const weights: DimensionWeights = activeConfig
        ? (activeConfig.dimensionWeights as unknown as DimensionWeights)
        : getDefaultWeights()

      // Merge existing scores with updated ones
      const mergedScores = {
        executionScore: parsed.data.executionScore ?? existing.executionScore,
        architectureScore: parsed.data.architectureScore ?? existing.architectureScore,
        thoughtProcessScore: parsed.data.thoughtProcessScore ?? existing.thoughtProcessScore,
        aiUsageScore: parsed.data.aiUsageScore ?? existing.aiUsageScore,
        deploymentScore: parsed.data.deploymentScore ?? existing.deploymentScore,
        codeOrganizationScore: parsed.data.codeOrganizationScore ?? existing.codeOrganizationScore,
        uiUxScore: parsed.data.uiUxScore ?? existing.uiUxScore,
        communicationScore: parsed.data.communicationScore ?? existing.communicationScore,
      }
      totalScore = calculateCompositeScore(mergedScores, weights)
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.executionScore !== undefined) updateData.executionScore = parsed.data.executionScore
    if (parsed.data.architectureScore !== undefined) updateData.architectureScore = parsed.data.architectureScore
    if (parsed.data.thoughtProcessScore !== undefined) updateData.thoughtProcessScore = parsed.data.thoughtProcessScore
    if (parsed.data.aiUsageScore !== undefined) updateData.aiUsageScore = parsed.data.aiUsageScore
    if (parsed.data.deploymentScore !== undefined) updateData.deploymentScore = parsed.data.deploymentScore
    if (parsed.data.codeOrganizationScore !== undefined) updateData.codeOrganizationScore = parsed.data.codeOrganizationScore
    if (parsed.data.uiUxScore !== undefined) updateData.uiUxScore = parsed.data.uiUxScore
    if (parsed.data.communicationScore !== undefined) updateData.communicationScore = parsed.data.communicationScore
    if (totalScore !== undefined) updateData.totalScore = totalScore
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes
    updateData.status = "COMPLETED"

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: updateData,
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EVALUATION_UPDATED",
        metadata: {
          evaluationId: id,
          submissionId: existing.submissionId,
          totalScore: totalScore ?? existing.totalScore,
        },
      },
    })

    return NextResponse.json({ evaluation })
  } catch (error) {
    console.error("Update evaluation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
