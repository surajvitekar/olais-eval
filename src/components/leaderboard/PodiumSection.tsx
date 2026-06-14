"use client"

import { motion } from "framer-motion"
import LevelBadge from "./LevelBadge"
import BadgeDisplay from "./BadgeDisplay"

interface PodiumEntry {
  rank: number
  name: string
  level: number
  levelName: string
  tier: string
  levelEmoji: string
  levelColor: string
  xp: number
  evaluationScore: number | null
  badges: Array<{ slug: string; name: string; emoji: string }>
  userId: string
}

interface PodiumSectionProps {
  entries: PodiumEntry[]
  currentUserId?: string | null
}

const PODIUM_STYLES = {
  1: {
    height: "h-28 sm:h-36",
    bg: "bg-gradient-to-t from-yellow-500/20 to-yellow-500/5",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    emoji: "👑",
    label: "1st",
    delay: 0.3,
  },
  2: {
    height: "h-20 sm:h-28",
    bg: "bg-gradient-to-t from-gray-400/20 to-gray-400/5",
    border: "border-gray-400/30",
    text: "text-gray-300",
    emoji: "🥈",
    label: "2nd",
    delay: 0.1,
  },
  3: {
    height: "h-16 sm:h-24",
    bg: "bg-gradient-to-t from-amber-700/20 to-amber-700/5",
    border: "border-amber-700/30",
    text: "text-amber-600",
    emoji: "🥉",
    label: "3rd",
    delay: 0.2,
  },
}

export default function PodiumSection({ entries, currentUserId }: PodiumSectionProps) {
  if (entries.length === 0) return null

  // Sort by rank: 2nd, 1st, 3rd for display order (2 on left, 1 center, 3 right)
  const sorted = [entries.find(e => e.rank === 2), entries.find(e => e.rank === 1), entries.find(e => e.rank === 3)].filter(Boolean)

  return (
    <div className="mb-8">
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {sorted.map((entry) => {
          if (!entry) return null
          const style = PODIUM_STYLES[entry.rank as 1 | 2 | 3]
          const isYou = entry.userId === currentUserId

          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: style.delay, ease: "easeOut" }}
              className={`flex flex-col items-center ${entry.rank === 1 ? "order-2" : entry.rank === 2 ? "order-1" : "order-3"}`}
            >
              {/* Avatar/Emoji */}
              <div className={`mb-2 text-center ${isYou ? "ring-2 ring-primary/50 rounded-full" : ""}`}>
                <span className="text-3xl sm:text-4xl">{style.emoji}</span>
                {isYou && <p className="text-[10px] text-primary mt-0.5">(you)</p>}
              </div>

              {/* Card */}
              <div
                className={`w-28 sm:w-36 rounded-xl ${style.bg} ${style.border} border p-3 text-center ${style.height} flex flex-col justify-end`}
              >
                <p className={`font-bold text-sm ${style.text}`}>#{entry.rank}</p>
                <p className="font-medium text-xs truncate">{entry.name.split(" ")[0]}</p>
                <p className="text-[10px] text-muted-foreground">{entry.xp.toLocaleString()} XP</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <LevelBadge level={entry.level} name={entry.levelName} emoji={entry.levelEmoji} color={entry.levelColor} />
                </div>
              </div>

              {/* Podium block */}
              <div
                className={`w-28 sm:w-36 rounded-t-lg mt-1 ${
                  entry.rank === 1 ? "h-16 sm:h-20 bg-gradient-to-t from-yellow-500/30 to-yellow-500/10" :
                  entry.rank === 2 ? "h-12 sm:h-16 bg-gradient-to-t from-gray-400/30 to-gray-400/10" :
                  "h-10 sm:h-12 bg-gradient-to-t from-amber-700/30 to-amber-700/10"
                }`}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
