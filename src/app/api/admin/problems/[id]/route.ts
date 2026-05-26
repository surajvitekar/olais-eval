import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const problemUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  slug: z.string().min(3).max(200).optional(),
  category: z.string().min(1).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  overview: z.string().min(50).optional(),
  requirements: z.array(z.string()).min(3).optional(),
  constraints: z.array(z.string()).min(1).optional(),
  bonusFeatures: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).min(1).optional(),
  evaluationCriteria: z.array(z.string()).min(3).optional(),
  isActive: z.boolean().optional(),
  variantGroup: z.string().nullable().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const problem = await prisma.problemTemplate.findUnique({
      where: { id },
    })

    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ problem })
  } catch (error) {
    console.error("Get problem error:", error)
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
    const parsed = problemUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // If slug is being updated, check uniqueness
    if (parsed.data.slug) {
      const existing = await prisma.problemTemplate.findUnique({
        where: { slug: parsed.data.slug },
      })
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "A problem with this slug already exists" },
          { status: 409 }
        )
      }
    }

    const problem = await prisma.problemTemplate.update({
      where: { id },
      data: parsed.data,
    })

    // Audit: problem updated
    await logAudit("problem.update", {
      problemId: id,
      updatedFields: Object.keys(parsed.data),
    }, session.user.id)

    return NextResponse.json({ problem })
  } catch (error) {
    console.error("Update problem error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const problem = await prisma.problemTemplate.findUnique({
      where: { id },
    })

    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      )
    }

    // Soft delete
    await prisma.problemTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    // Audit: problem deactivated
    await logAudit("problem.deactivate", {
      problemId: id,
      title: problem.title,
    }, session.user.id)

    return NextResponse.json({ message: "Problem deactivated" })
  } catch (error) {
    console.error("Delete problem error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
