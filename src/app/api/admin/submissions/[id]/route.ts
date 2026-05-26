import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, status: true },
        },
        assignedProblem: {
          include: {
            template: {
              select: {
                title: true,
                slug: true,
                category: true,
                difficulty: true,
                overview: true,
                requirements: true,
                constraints: true,
                deliverables: true,
                evaluationCriteria: true,
              },
            },
          },
        },
        evaluations: {
          orderBy: { createdAt: "desc" },
          include: {
            evaluator: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    return NextResponse.json({ submission })
  } catch (error) {
    console.error("Get submission error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
