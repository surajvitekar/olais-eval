"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow"
import PodiumSection from "@/components/leaderboard/PodiumSection"
import PersonalStatsPanel from "@/components/leaderboard/PersonalStatsPanel"
import { Card, CardContent } from "@/components/ui/card"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { Trophy, Sparkles } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  id: string
  userId: string
  name: string
  submissionCount: number
  fastestTime: number | null
  evaluationScore: number | null
  interviewScore: number | null
  totalScore: number | null
  status: string
  cycleId: string
  xp: number
  level: number
  levelName: string
  tier: string
  levelEmoji: string
  levelColor: string
  previousRank: number | null
  rankChange: "up" | "down" | "same" | "new"
  rankChangeAmount: number
  badges: Array<{ slug: string; name: string; emoji: string }>
  xpProgress: { current: number; nextLevel: number; percent: number; remaining: number }
}

interface CurrentUserStats {
  rank: number
  xp: number
  level: number
  levelName: string
  tier: string
  badges: Array<{ slug: string; name: string; emoji: string }>
  totalSubmissions: number
  avgScore: number | null
  bestScore: number | null
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserStats, setCurrentUserStats] = useState<CurrentUserStats | null>(null)
  const [statsOpen, setStatsOpen] = useState(true)

  useEffect(() => {
    fetchLeaderboard()

    // Try to get current user from session
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.id) {
          setCurrentUserId(data.user.id)
        }
      })
      .catch(() => {})
  }, [])

  async function fetchLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard")
      if (!res.ok) throw new Error("Failed to fetch leaderboard")
      const data = await res.json()
      setEntries(data.leaderboard || [])
      setCurrentUserStats(data.currentUserStats || null)
    } catch (err) {
      setError("Failed to load leaderboard")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <LoadingSpinner text="Loading leaderboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <Sparkles className="h-5 w-5 text-yellow-400/60" />
        </div>
        <p className="text-muted-foreground">
          Top candidates ranked by submissions and performance
        </p>
        {currentUserStats && (
          <p className="text-xs text-muted-foreground/60 mt-1">
            You are ranked #{currentUserStats.rank} &middot; {currentUserStats.xp.toLocaleString()} XP &middot; Level {currentUserStats.level}: {currentUserStats.levelName}
          </p>
        )}
      </motion.div>

      {/* Personal Stats Panel */}
      {currentUserStats && (
        <PersonalStatsPanel
          stats={currentUserStats}
          isOpen={statsOpen}
          onToggle={() => setStatsOpen(!statsOpen)}
        />
      )}

      {/* Podium */}
      <PodiumSection
        entries={top3}
        currentUserId={currentUserId}
      />

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium">No entries yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Leaderboard will populate as candidates submit solutions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <div className="w-12 text-center shrink-0">Rank</div>
            <div className="flex-1">Name</div>
            <div className="text-center shrink-0 w-16">Problems</div>
            <div className="text-center shrink-0 w-20">Fastest</div>
            <div className="text-center shrink-0 w-16">AI Score</div>
            <div className="text-center shrink-0 w-16">Interview</div>
            <div className="text-center shrink-0 w-16">Total</div>
            <div className="shrink-0 w-24">Status</div>
          </div>

          {/* Rows 4+ */}
          {rest.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
            >
              <LeaderboardRow
                rank={entry.rank}
                name={entry.name}
                submissionCount={entry.submissionCount}
                fastestTime={entry.fastestTime}
                evaluationScore={entry.evaluationScore}
                interviewScore={entry.interviewScore}
                totalScore={entry.totalScore}
                status={entry.status}
                isCurrentUser={entry.userId === currentUserId}
                xp={entry.xp}
                level={entry.level}
                levelName={entry.levelName}
                tier={entry.tier}
                levelEmoji={entry.levelEmoji}
                levelColor={entry.levelColor}
                rankChange={entry.rankChange}
                rankChangeAmount={entry.rankChangeAmount}
                badges={entry.badges}
                xpProgress={entry.xpProgress}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
