import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const problemCreateSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  category: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  overview: z.string().min(50),
  requirements: z.array(z.string()).min(3),
  constraints: z.array(z.string()).min(1),
  bonusFeatures: z.array(z.string()).optional().default([]),
  deliverables: z.array(z.string()).min(1),
  evaluationCriteria: z.array(z.string()).min(3),
  isActive: z.boolean().optional().default(true),
  variantGroup: z.string().nullable().optional(),
})

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
    const category = url.searchParams.get("category") ?? ""
    const activeOnly = url.searchParams.get("active") ?? ""

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }
    if (category) {
      where.category = category
    }
    if (activeOnly === "true") {
      where.isActive = true
    } else if (activeOnly === "false") {
      where.isActive = false
    }

    const [problems, total] = await Promise.all([
      prisma.problemTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.problemTemplate.count({ where }),
    ])

    return NextResponse.json({
      problems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("List problems error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = problemCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const existing = await prisma.problemTemplate.findUnique({
      where: { slug: parsed.data.slug },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A problem with this slug already exists" },
        { status: 409 }
      )
    }

    const problem = await prisma.problemTemplate.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        category: parsed.data.category,
        difficulty: parsed.data.difficulty,
        overview: parsed.data.overview,
        requirements: parsed.data.requirements,
        constraints: parsed.data.constraints,
        bonusFeatures: parsed.data.bonusFeatures,
        deliverables: parsed.data.deliverables,
        evaluationCriteria: parsed.data.evaluationCriteria,
        isActive: parsed.data.isActive,
        variantGroup: parsed.data.variantGroup ?? null,
      },
    })

    return NextResponse.json({ problem }, { status: 201 })
  } catch (error) {
    console.error("Create problem error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
