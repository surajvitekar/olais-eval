import { prisma } from "@/lib/prisma"
import { calculateXP, getLevelForXP, computeBadges, computeRankChange } from "@/lib/gamification"

/**
 * Sync a candidate's submission to the leaderboard.
 * Called by the submit API after a successful submission.
 */
export async function syncLeaderboardEntry(userId: string): Promise<void> {
  try {
    // Count total submissions for this user
    const submissionCount = await prisma.submission.count({
      where: { userId },
    })

    // Find fastest time (minimum elapsedSeconds across all submissions)
    const fastestSubmission = await prisma.submission.findFirst({
      where: {
        userId,
        elapsedSeconds: { not: null },
      },
      orderBy: { elapsedSeconds: "asc" },
      select: { elapsedSeconds: true },
    })

    // Get user's latest status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    })

    // Get the best evaluation score for this user
    const bestEvaluation = await prisma.evaluation.findFirst({
      where: {
        submission: { userId },
      },
      orderBy: { totalScore: "desc" },
      select: { totalScore: true },
    })

    // Determine cycle ID
    const now = new Date()
    const cycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    // Compute gamification values
    const xp = calculateXP({
      submissionCount,
      evaluationScore: bestEvaluation?.totalScore ?? null,
      fastestTime: fastestSubmission?.elapsedSeconds ?? null,
    })
    const level = getLevelForXP(xp).level
    const badges = computeBadges({
      submissionCount,
      evaluationScore: bestEvaluation?.totalScore ?? null,
      fastestTime: fastestSubmission?.elapsedSeconds ?? null,
      status: user?.status ?? "active",
    })

    // Get existing entry to preserve previousRank
    const existingEntry = await prisma.leaderboardEntry.findUnique({
      where: {
        userId_cycleId: { userId, cycleId },
      },
    })

    // Compute current rank among all entries (for position change tracking)
    const allEntries = await prisma.leaderboardEntry.findMany({
      where: { hidden: false },
      orderBy: [
        { submissionCount: "desc" },
        { fastestTime: "asc" },
      ],
      select: { id: true },
    })
    const currentRank = allEntries.findIndex(e => e.id === existingEntry?.id) + 1

    // Determine previousRank: use existing entry's rank from last sync
    let previousRank: number | null = existingEntry?.previousRank ?? null
    if (existingEntry) {
      previousRank = existingEntry.previousRank
    }

    // Upsert leaderboard entry
    await prisma.leaderboardEntry.upsert({
      where: {
        userId_cycleId: {
          userId,
          cycleId,
        },
      },
      update: {
        submissionCount,
        fastestTime: fastestSubmission?.elapsedSeconds ?? null,
        evaluationScore: bestEvaluation?.totalScore ?? null,
        status: user?.status ?? "active",
        xp,
        level,
        badges: JSON.stringify(badges),
        previousRank,
      },
      create: {
        userId,
        cycleId,
        submissionCount,
        fastestTime: fastestSubmission?.elapsedSeconds ?? null,
        evaluationScore: bestEvaluation?.totalScore ?? null,
        status: user?.status ?? "active",
        hidden: false,
        xp,
        level,
        badges: JSON.stringify(badges),
        previousRank: null,
      },
    })

    // After upserting all entries, update previousRank for position tracking next time
    // Re-fetch current ordering to set each entry's previousRank
    const updatedEntries = await prisma.leaderboardEntry.findMany({
      where: { hidden: false },
      orderBy: [
        { submissionCount: "desc" },
        { fastestTime: "asc" },
      ],
      select: { id: true },
    })
    for (let i = 0; i < updatedEntries.length; i++) {
      await prisma.leaderboardEntry.update({
        where: { id: updatedEntries[i].id },
        data: { previousRank: i + 1 },
      })
    }
  } catch (error) {
    console.error("Leaderboard sync error:", error)
    // Don't throw - leaderboard sync is non-critical
  }
}

/**
 * Reset the leaderboard for a given cycle (or all cycles if no cycleId provided).
 */
export async function resetLeaderboard(cycleId?: string): Promise<void> {
  try {
    if (cycleId) {
      await prisma.leaderboardEntry.deleteMany({
        where: { cycleId },
      })
    } else {
      await prisma.leaderboardEntry.deleteMany({})
    }
  } catch (error) {
    console.error("Leaderboard reset error:", error)
    throw error
  }
}

/**
 * Toggle visibility of a leaderboard entry.
 */
export async function toggleLeaderboardVisibility(
  entryId: string,
  hidden: boolean
): Promise<void> {
  try {
    await prisma.leaderboardEntry.update({
      where: { id: entryId },
      data: { hidden },
    })
  } catch (error) {
    console.error("Leaderboard visibility toggle error:", error)
    throw error
  }
}
