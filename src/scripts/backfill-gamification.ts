/**
 * Script to backfill gamification data for existing leaderboard entries.
 * Run via: npx tsx src/scripts/backfill-gamification.ts
 */
import { prisma } from "../lib/prisma"
import { calculateXP, getLevelForXP, computeBadges } from "../lib/gamification"

async function backfill() {
  console.log("Backfilling gamification data...")

  const entries = await prisma.leaderboardEntry.findMany({
    include: {
      user: {
        select: { status: true },
      },
    },
  })

  console.log(`Found ${entries.length} entries to process`)

  // First pass: compute XP, level, badges
  for (const entry of entries) {
    const xp = calculateXP({
      submissionCount: entry.submissionCount,
      evaluationScore: entry.evaluationScore ?? null,
      fastestTime: entry.fastestTime ?? null,
    })
    const level = getLevelForXP(xp).level
    const badges = computeBadges({
      submissionCount: entry.submissionCount,
      evaluationScore: entry.evaluationScore ?? null,
      fastestTime: entry.fastestTime ?? null,
      status: entry.status,
      rank: 0, // will compute below
    })

    await prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: {
        xp,
        level,
        badges: JSON.stringify(badges),
      },
    })
  }

  // Second pass: compute ranks and previousRank
  const allEntries = await prisma.leaderboardEntry.findMany({
    where: { hidden: false },
    orderBy: [
      { submissionCount: "desc" },
      { fastestTime: "asc" },
    ],
    select: { id: true },
  })

  for (let i = 0; i < allEntries.length; i++) {
    await prisma.leaderboardEntry.update({
      where: { id: allEntries[i].id },
      data: { previousRank: i + 1 },
    })
  }

  // Third pass: recompute top performer badges now that we know ranks
  const rankedEntries = await prisma.leaderboardEntry.findMany({
    where: { hidden: false },
    orderBy: [
      { submissionCount: "desc" },
      { fastestTime: "asc" },
    ],
    include: {
      user: { select: { status: true } },
    },
  })

  for (let i = 0; i < rankedEntries.length; i++) {
    const entry = rankedEntries[i]
    const rank = i + 1
    const badges = computeBadges({
      submissionCount: entry.submissionCount,
      evaluationScore: entry.evaluationScore ?? null,
      fastestTime: entry.fastestTime ?? null,
      status: entry.status,
      rank,
    })

    await prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: { badges: JSON.stringify(badges) },
    })
  }

  console.log("Backfill complete!")
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
