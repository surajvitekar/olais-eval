"use client"

import { useState, useEffect } from "react"
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { Trophy } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  id: string
  userId: string
  name: string
  submissionCount: number
  fastestTime: number | null
  status: string
  cycleId: string
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()

    // Try to get current user from session for highlighting
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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground">
          Top candidates ranked by submissions and performance
        </p>
      </div>

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
            <div className="shrink-0 w-24">Status</div>
          </div>

          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.id}
              rank={entry.rank}
              name={entry.name}
              submissionCount={entry.submissionCount}
              fastestTime={entry.fastestTime}
              status={entry.status}
              isCurrentUser={entry.userId === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
