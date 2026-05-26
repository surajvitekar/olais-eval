import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const entries = await prisma.leaderboardEntry.findMany({
      orderBy: [
        { hidden: "asc" },
        { submissionCount: "desc" },
        { fastestTime: "asc" },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Admin leaderboard error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await prisma.leaderboardEntry.deleteMany({})

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "LEADERBOARD_RESET",
        metadata: { timestamp: new Date().toISOString() },
      },
    })

    return NextResponse.json({ message: "Leaderboard reset successfully" })
  } catch (error) {
    console.error("Leaderboard reset error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
