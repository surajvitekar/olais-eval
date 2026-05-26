import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")))
    const problemSearch = url.searchParams.get("problem") ?? ""
    const candidateSearch = url.searchParams.get("candidate") ?? ""
    const evalStatus = url.searchParams.get("evalStatus") ?? ""

    const where: Record<string, unknown> = {}
    if (problemSearch) {
      where.assignedProblem = {
        template: {
          title: { contains: problemSearch, mode: "insensitive" },
        },
      }
    }
    if (candidateSearch) {
      where.user = {
        OR: [
          { name: { contains: candidateSearch, mode: "insensitive" } },
          { email: { contains: candidateSearch, mode: "insensitive" } },
        ],
      }
    }

    // Handle eval status filter
    if (evalStatus === "evaluated") {
      where.evaluations = { some: {} }
    } else if (evalStatus === "pending") {
      where.evaluations = { none: {} }
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          assignedProblem: {
            include: {
              template: {
                select: { title: true, category: true, difficulty: true },
              },
            },
          },
          evaluations: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              totalScore: true,
              status: true,
            },
          },
        },
      }),
      prisma.submission.count({ where }),
    ])

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("List submissions error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
