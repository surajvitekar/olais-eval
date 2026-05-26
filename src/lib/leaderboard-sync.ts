import { prisma } from "@/lib/prisma"

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

    // Determine cycle ID (use current date-based cycle for now)
    const now = new Date()
    const cycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

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
        status: user?.status ?? "active",
      },
      create: {
        userId,
        cycleId,
        submissionCount,
        fastestTime: fastestSubmission?.elapsedSeconds ?? null,
        status: user?.status ?? "active",
        hidden: false,
      },
    })
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
