"use client"

import LevelBadge from "./LevelBadge"
import BadgeDisplay from "./BadgeDisplay"
import XPProgressBar from "./XPProgressBar"
import { motion } from "framer-motion"

interface PersonalStatsPanelProps {
  stats: {
    rank: number
    xp: number
    level: number
    levelName: string
    tier: string
    badges: Array<{ slug: string; name: string; emoji: string }>
    totalSubmissions: number
    avgScore: number | null
    bestScore: number | null
  } | null
  isOpen: boolean
  onToggle: () => void
}

export default function PersonalStatsPanel({ stats, isOpen, onToggle }: PersonalStatsPanelProps) {
  if (!stats) return null

  // Dummy color/emoji for the panel
  const levelEmoji = stats.level >= 6 ? "👑" : stats.level >= 4 ? "🏆" : stats.level >= 2 ? "⭐" : "🥉"

  return (
    <div className="mb-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{levelEmoji}</span>
          <div className="text-left">
            <p className="font-medium text-sm">Your Performance</p>
            <p className="text-xs text-muted-foreground">
              Rank #{stats.rank} &middot; {stats.xp.toLocaleString()} XP &middot; Level {stats.level}: {stats.levelName}
            </p>
          </div>
        </div>
        <div className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-2 p-4 rounded-lg border border-border bg-card/50"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Rank</p>
              <p className="text-xl font-bold">#{stats.rank}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">XP</p>
              <p className="text-xl font-bold">{stats.xp.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Problems</p>
              <p className="text-xl font-bold">{stats.totalSubmissions}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Best Score</p>
              <p className="text-xl font-bold">{stats.bestScore ?? "—"}</p>
            </div>
          </div>

          {stats.badges.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Badges Earned</p>
              <BadgeDisplay badges={stats.badges} />
            </div>
          )}

          <div className="mt-2">
            <XPProgressBar
              current={stats.xp}
              nextLevel={stats.level >= 7 ? stats.xp : (stats.level + 1) * 2000}
              percent={Math.min(100, ((stats.xp % 2000) / 2000) * 100)}
              color={stats.tier}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}
