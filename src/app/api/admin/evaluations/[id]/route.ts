import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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
                template: { select: { title: true, slug: true, category: true } },
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

    return NextResponse.json({ evaluation })
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

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        ...(parsed.data.executionScore !== undefined && { executionScore: parsed.data.executionScore }),
        ...(parsed.data.architectureScore !== undefined && { architectureScore: parsed.data.architectureScore }),
        ...(parsed.data.thoughtProcessScore !== undefined && { thoughtProcessScore: parsed.data.thoughtProcessScore }),
        ...(parsed.data.aiUsageScore !== undefined && { aiUsageScore: parsed.data.aiUsageScore }),
        ...(parsed.data.deploymentScore !== undefined && { deploymentScore: parsed.data.deploymentScore }),
        ...(parsed.data.codeOrganizationScore !== undefined && { codeOrganizationScore: parsed.data.codeOrganizationScore }),
        ...(parsed.data.uiUxScore !== undefined && { uiUxScore: parsed.data.uiUxScore }),
        ...(parsed.data.communicationScore !== undefined && { communicationScore: parsed.data.communicationScore }),
        ...(parsed.data.totalScore !== undefined && { totalScore: parsed.data.totalScore }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        status: "COMPLETED",
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EVALUATION_UPDATED",
        metadata: {
          evaluationId: id,
          submissionId: existing.submissionId,
          totalScore: parsed.data.totalScore ?? existing.totalScore,
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
