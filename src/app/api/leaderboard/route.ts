import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLevelForXP, getXPProgress, computeRankChange, computeBadges } from "@/lib/gamification"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const cycleId = url.searchParams.get("cycle") ?? ""
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")))
    const minScore = url.searchParams.get("minScore")

    const where: Record<string, unknown> = {
      hidden: false,
    }
    if (cycleId) {
      where.cycleId = cycleId
    }
    if (minScore) {
      where.combinedScore = { gte: parseFloat(minScore) }
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

    // Map to public-safe format with gamification fields
    const leaderboard = entries.map((entry, index) => {
      const rank = index + 1
      const xp = entry.xp ?? 0
      const levelInfo = getLevelForXP(xp)
      const xpProgress = getXPProgress(xp)
      const rankChange = computeRankChange(rank, entry.previousRank)
      const badges = typeof entry.badges === "string"
        ? JSON.parse(entry.badges)
        : Array.isArray(entry.badges)
          ? entry.badges
          : []

      return {
        rank,
        id: entry.id,
        userId: entry.userId,
        name: entry.user.name || "Anonymous",
        submissionCount: entry.submissionCount,
        fastestTime: entry.fastestTime,
        evaluationScore: entry.evaluationScore ?? null,
        interviewScore: entry.interviewScore ?? null,
        totalScore: entry.combinedScore ?? null,
        status: entry.user.status,
        cycleId: entry.cycleId,
        // Gamification
        xp,
        level: levelInfo.level,
        levelName: levelInfo.name,
        tier: levelInfo.tier,
        levelEmoji: levelInfo.emoji,
        levelColor: levelInfo.color,
        previousRank: entry.previousRank,
        rankChange: rankChange.type,
        rankChangeAmount: rankChange.amount,
        badges,
        xpProgress,
      }
    })

    // Compute current user stats if logged in
    const session = await auth()
    let currentUserStats = null
    if (session?.user?.id) {
      const myEntry = entries.find(e => e.userId === session.user.id)
      if (myEntry) {
        const myRank = entries.findIndex(e => e.id === myEntry.id) + 1
        const myLevel = getLevelForXP(myEntry.xp ?? 0)
        const myBadges = typeof myEntry.badges === "string"
          ? JSON.parse(myEntry.badges)
          : Array.isArray(myEntry.badges)
            ? myEntry.badges
            : []
        currentUserStats = {
          rank: myRank,
          xp: myEntry.xp ?? 0,
          level: myLevel.level,
          levelName: myLevel.name,
          tier: myLevel.tier,
          badges: myBadges,
          totalSubmissions: myEntry.submissionCount,
          avgScore: myEntry.evaluationScore ?? null,
          bestScore: myEntry.evaluationScore ?? null,
        }
      }
    }

    return NextResponse.json({ leaderboard, currentUserStats })
  } catch (error) {
    console.error("Leaderboard error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
