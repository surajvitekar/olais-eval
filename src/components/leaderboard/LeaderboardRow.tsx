"use client"

import { Badge } from "@/components/ui/badge"
import LevelBadge from "./LevelBadge"
import PositionChange from "./PositionChange"
import BadgeDisplay from "./BadgeDisplay"
import XPProgressBar from "./XPProgressBar"

interface LeaderboardRowProps {
  rank: number
  name: string
  submissionCount: number
  fastestTime: number | null
  evaluationScore: number | null
  interviewScore: number | null
  totalScore: number | null
  status: string
  isCurrentUser?: boolean
  // Gamification
  xp?: number
  level?: number
  levelName?: string
  tier?: string
  levelEmoji?: string
  levelColor?: string
  previousRank?: number | null
  rankChange?: "up" | "down" | "same" | "new"
  rankChangeAmount?: number
  badges?: Array<{ slug: string; name: string; emoji: string }>
  xpProgress?: { current: number; nextLevel: number; percent: number; remaining: number }
}

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  ASSESSMENT_COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PROBLEM_ASSIGNED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  SUBMITTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  SHORTLISTED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  SELECTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
}

const STATUS_LABELS: Record<string, string> = {
  REGISTERED: "Registered",
  ASSESSMENT_COMPLETED: "Assessed",
  PROBLEM_ASSIGNED: "Problems Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  SELECTED: "Selected",
}

function formatTime(seconds: number | null): string {
  if (!seconds) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return `#${rank}`
}

export default function LeaderboardRow({
  rank,
  name,
  submissionCount,
  fastestTime,
  evaluationScore,
  interviewScore,
  totalScore,
  status,
  isCurrentUser,
  xp,
  level = 1,
  levelName = "Getting Started",
  tier = "bronze_iii",
  levelEmoji = "🥉",
  levelColor = "amber-700",
  rankChange,
  rankChangeAmount = 0,
  badges,
  xpProgress,
}: LeaderboardRowProps) {
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border border-border p-4 transition-colors ${
        isCurrentUser
          ? "bg-primary/5 border-primary/20"
          : "hover:bg-muted/50"
      }`}
    >
      {/* Rank + Position Change */}
      <div className="w-12 text-center shrink-0">
        <p className="text-lg font-bold tabular-nums">{getRankDisplay(rank)}</p>
        {rankChange && (
          <PositionChange type={rankChange} amount={rankChangeAmount} />
        )}
      </div>

      {/* Name + Level Badge + XP + Badges */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {name}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-primary font-normal">(you)</span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <LevelBadge level={level} name={levelName} emoji={levelEmoji} color={levelColor} />
          <BadgeDisplay badges={badges || []} />
          {xp != null && (
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {xp.toLocaleString()} XP
            </span>
          )}
        </div>
        {xpProgress && rank > 3 && (
          <XPProgressBar
            current={xpProgress.current}
            nextLevel={xpProgress.nextLevel}
            percent={xpProgress.percent}
            color={tier}
          />
        )}
      </div>

      {/* Submission Count */}
      <div className="text-center shrink-0">
        <p className="text-sm text-muted-foreground">Problems</p>
        <p className="font-bold tabular-nums">{submissionCount}</p>
      </div>

      {/* Fastest Time */}
      <div className="text-center shrink-0">
        <p className="text-sm text-muted-foreground">Fastest</p>
        <p className="font-medium tabular-nums text-sm">{formatTime(fastestTime)}</p>
      </div>

      {/* AI Score */}
      <div className="text-center shrink-0 w-16">
        <p className="text-sm text-muted-foreground">AI Score</p>
        <p className="font-bold tabular-nums">
          {evaluationScore !== null && evaluationScore !== undefined
            ? Math.round(evaluationScore)
            : "—"}
        </p>
      </div>

      {/* Interview Score */}
      <div className="text-center shrink-0 w-16">
        <p className="text-sm text-muted-foreground">Interview</p>
        <p className="font-medium tabular-nums text-sm text-muted-foreground/50">
          {interviewScore !== null && interviewScore !== undefined
            ? Math.round(interviewScore)
            : "xx"}
        </p>
      </div>

      {/* Total Score */}
      <div className="text-center shrink-0 w-16">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="font-medium tabular-nums text-sm text-muted-foreground/50">
          {totalScore !== null && totalScore !== undefined
            ? Math.round(totalScore)
            : "xx"}
        </p>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <Badge
          className={`text-xs ${
            STATUS_COLORS[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
          }`}
        >
          {STATUS_LABELS[status] || status}
        </Badge>
      </div>
    </div>
  )
}
