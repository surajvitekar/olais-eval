import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const visibilitySchema = z.object({
  hidden: z.boolean(),
})

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
    const parsed = visibilitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const entry = await prisma.leaderboardEntry.findUnique({
      where: { id },
    })

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    const updated = await prisma.leaderboardEntry.update({
      where: { id },
      data: { hidden: parsed.data.hidden },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "LEADERBOARD_VISIBILITY",
        metadata: {
          entryId: id,
          userId: entry.userId,
          hidden: parsed.data.hidden,
        },
      },
    })

    return NextResponse.json({ entry: updated })
  } catch (error) {
    console.error("Leaderboard visibility error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
