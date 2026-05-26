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

    const candidate = await prisma.user.findUnique({
      where: { id },
      include: {
        skillProfiles: {
          orderBy: { generatedAt: "desc" },
          take: 5,
        },
        assessmentResponses: {
          include: {
            question: true,
          },
          orderBy: { createdAt: "desc" },
        },
        assignedProblems: {
          orderBy: { assignedAt: "desc" },
          include: {
            template: {
              select: {
                title: true,
                category: true,
                difficulty: true,
              },
            },
            submissions: {
              include: {
                evaluations: {
                  select: {
                    id: true,
                    totalScore: true,
                    status: true,
                  },
                },
              },
              orderBy: { submittedAt: "desc" },
            },
          },
        },
        evaluations: {
          orderBy: { createdAt: "desc" },
          include: {
            evaluator: {
              select: { name: true, email: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    })

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    if (candidate.role !== "CANDIDATE") {
      return NextResponse.json({ error: "User is not a candidate" }, { status: 400 })
    }

    return NextResponse.json({ candidate })
  } catch (error) {
    console.error("Get candidate error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
