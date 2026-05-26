import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const cycleId = url.searchParams.get("cycle") ?? ""
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")))

    const where: Record<string, unknown> = {
      hidden: false,
    }
    if (cycleId) {
      where.cycleId = cycleId
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where,
      orderBy: [
        { submissionCount: "desc" },
        { fastestTime: "asc" },
      ],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    })

    // Map to public-safe format (no emails in public API)
    const leaderboard = entries.map((entry, index) => ({
      rank: index + 1,
      id: entry.id,
      userId: entry.userId,
      name: entry.user.name || "Anonymous",
      submissionCount: entry.submissionCount,
      fastestTime: entry.fastestTime,
      status: entry.user.status,
      cycleId: entry.cycleId,
    }))

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error("Leaderboard error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
