import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─── GET /api/admin/plagiarism/cycles ────────────────────────────────────────
// Returns a list of available cycles for the dropdown selector

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get unique cycle IDs from leaderboard entries
    const cycles = await prisma.leaderboardEntry.findMany({
      select: { cycleId: true },
      distinct: ["cycleId"],
      orderBy: { cycleId: "asc" },
    })

    // Format as { id, name } objects
    const cycleList = cycles.map((c) => ({
      id: c.cycleId,
      name: `Cycle ${c.cycleId.slice(0, 8)}`,
    }))

    return NextResponse.json(cycleList)
  } catch (error) {
    console.error("Error fetching cycles:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
