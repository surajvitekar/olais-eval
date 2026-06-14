/**
 * Gamification system for the Olais Eval leaderboard.
 * Computes XP, levels, tiers, and badges from leaderboard entry data.
 */

export interface BadgeData {
  slug: string
  name: string
  emoji: string
}

export interface LevelInfo {
  level: number
  name: string
  tier: string
  emoji: string
  color: string
  xpRequired: number
}

export interface XPProgress {
  current: number
  nextLevel: number
  percent: number
  remaining: number
}

export interface ComputedBadge {
  slug: string
  name: string
  emoji: string
  earnedAt?: string
}

// ── Tier Definitions ─────────────────────────────────────────────────────────

const TIERS: LevelInfo[] = [
  { level: 1, name: "Getting Started", tier: "bronze_iii", emoji: "🥉", color: "amber-700", xpRequired: 0 },
  { level: 2, name: "Apprentice", tier: "bronze_ii", emoji: "🥈", color: "amber-600", xpRequired: 500 },
  { level: 3, name: "Developer", tier: "bronze_i", emoji: "⭐", color: "amber-500", xpRequired: 1500 },
  { level: 4, name: "Engineer", tier: "silver_ii", emoji: "🌟", color: "gray-400", xpRequired: 3000 },
  { level: 5, name: "Senior", tier: "silver_i", emoji: "💫", color: "gray-300", xpRequired: 5000 },
  { level: 6, name: "Expert", tier: "gold_ii", emoji: "🏆", color: "yellow-400", xpRequired: 8000 },
  { level: 7, name: "Master", tier: "gold_i", emoji: "👑", color: "yellow-300", xpRequired: 12000 },
]

export function getLevelForXP(xp: number): LevelInfo {
  let result = TIERS[0]
  for (const tier of TIERS) {
    if (xp >= tier.xpRequired) {
      result = tier
    }
  }
  return result
}

export function getXPProgress(currentXP: number): XPProgress {
  const currentLevel = getLevelForXP(currentXP)
  const nextLevelIndex = TIERS.indexOf(currentLevel) + 1

  if (nextLevelIndex >= TIERS.length) {
    // Max level — no progress bar needed
    return { current: currentXP, nextLevel: currentXP, percent: 100, remaining: 0 }
  }

  const nextTier = TIERS[nextLevelIndex]
  const tierStart = currentLevel.xpRequired
  const tierEnd = nextTier.xpRequired
  const progress = currentXP - tierStart
  const range = tierEnd - tierStart
  const percent = Math.min(100, Math.round((progress / range) * 100))
  const remaining = tierEnd - currentXP

  return { current: currentXP, nextLevel: tierEnd, percent, remaining }
}

export function calculateXP(entry: {
  submissionCount: number
  evaluationScore?: number | null
  fastestTime?: number | null
}): number {
  let xp = 0
  // Base XP per submission
  xp += entry.submissionCount * 100
  // Score-based XP
  if (entry.evaluationScore != null) {
    xp += Math.round(entry.evaluationScore * 10)
  }
  // Speed bonus — fastest submission under 1 hour
  if (entry.fastestTime != null && entry.fastestTime < 3600) {
    xp += 50
  }
  return xp
}

// ── Badge Evaluation ─────────────────────────────────────────────────────────

export function computeBadges(entry: {
  submissionCount: number
  evaluationScore?: number | null
  fastestTime?: number | null
  status: string
  rank?: number
}): ComputedBadge[] {
  const badges: ComputedBadge[] = []

  // First Submission — everyone who has submitted gets this
  if (entry.submissionCount >= 1) {
    badges.push({ slug: "first_submission", name: "First Submission", emoji: "🚀" })
  }

  // Speed Demon — fastest submission under 30 min
  if (entry.fastestTime != null && entry.fastestTime < 1800) {
    badges.push({ slug: "speed_demon", name: "Speed Demon", emoji: "⚡" })
  }

  // Perfect Score — evaluationScore >= 90
  if (entry.evaluationScore != null && entry.evaluationScore >= 90) {
    badges.push({ slug: "perfect_score", name: "Perfect Score", emoji: "💎" })
  }

  // Consistent — 2+ submissions
  if (entry.submissionCount >= 2) {
    badges.push({ slug: "consistent", name: "Consistent", emoji: "🔥" })
  }

  // Overachiever — 3+ submissions
  if (entry.submissionCount >= 3) {
    badges.push({ slug: "overachiever", name: "Overachiever", emoji: "💪" })
  }

  // Top Performer — currently in top 3
  if (entry.rank != null && entry.rank <= 3) {
    badges.push({ slug: "top_performer", name: "Top Performer", emoji: "🏅" })
  }

  // Interview Ready — status is UNDER_REVIEW or higher
  const advancedStatuses = ["UNDER_REVIEW", "SHORTLISTED", "SELECTED"]
  if (advancedStatuses.includes(entry.status)) {
    badges.push({ slug: "interview_ready", name: "Interview Ready", emoji: "🎯" })
  }

  return badges
}

// ── Rank Change ──────────────────────────────────────────────────────────────

export type RankChangeType = "up" | "down" | "same" | "new"

export function computeRankChange(
  currentRank: number,
  previousRank?: number | null
): { type: RankChangeType; amount: number } {
  if (previousRank == null) {
    return { type: "new", amount: 0 }
  }
  if (currentRank < previousRank) {
    return { type: "up", amount: previousRank - currentRank }
  }
  if (currentRank > previousRank) {
    return { type: "down", amount: currentRank - previousRank }
  }
  return { type: "same", amount: 0 }
}
