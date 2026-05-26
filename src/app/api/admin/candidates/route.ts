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
    const search = url.searchParams.get("search") ?? ""
    const status = url.searchParams.get("status") ?? ""

    const where: Record<string, unknown> = { role: "CANDIDATE" }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }
    if (status) {
      where.status = status
    }

    const [candidates, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          phone: true,
          college: true,
          createdAt: true,
          skillProfiles: {
            orderBy: { generatedAt: "desc" },
            take: 1,
            select: {
              scores: true,
              topSkills: true,
            },
          },
          assignedProblems: {
            select: { id: true, status: true },
          },
          submissions: {
            select: { id: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("List candidates error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
