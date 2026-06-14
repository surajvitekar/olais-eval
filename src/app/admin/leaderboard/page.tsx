"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { toast } from "sonner"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface LeaderboardEntry {
  id: string
  userId: string
  submissionCount: number
  fastestTime: number | null
  evaluationScore: number | null
  interviewScore: number | null
  combinedScore: number | null
  status: string
  hidden: boolean
  cycleId: string
  user: {
    name: string | null
    email: string
    status: string
  }
}

const STATUS_STYLES: Record<string, string> = {
  REGISTERED: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300",
  ASSESSMENT_COMPLETED: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300",
  PROBLEM_ASSIGNED: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300",
  SUBMITTED: "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300",
  UNDER_REVIEW: "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300",
  SHORTLISTED: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300",
  SELECTED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300",
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-800"
  return (
    <Badge className={`font-medium ${style}`} variant="outline">
      {status.replace(/_/g, " ")}
    </Badge>
  )
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

function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—"
  return score.toFixed(1)
}

function sortEntries(entries: LeaderboardEntry[], sortField: string, sortDir: "asc" | "desc"): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    let aVal: number | null = null
    let bVal: number | null = null

    switch (sortField) {
      case "combinedScore":
        aVal = a.combinedScore
        bVal = b.combinedScore
        break
      case "evaluationScore":
        aVal = a.evaluationScore
        bVal = b.evaluationScore
        break
      case "interviewScore":
        aVal = a.interviewScore
        bVal = b.interviewScore
        break
      case "submissionCount":
        aVal = a.submissionCount
        bVal = b.submissionCount
        break
      case "fastestTime":
        aVal = a.fastestTime
        bVal = b.fastestTime
        break
      default:
        return 0
    }

    // Nulls last
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1

    return sortDir === "asc" ? aVal - bVal : bVal - aVal
  })
}

export default function AdminLeaderboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Sorting state
  const [sortField, setSortField] = useState("combinedScore")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchEntries()
    }
  }, [status, session, router])

  async function fetchEntries() {
    try {
      const res = await fetch("/api/admin/leaderboard")
      if (!res.ok) throw new Error("Failed to fetch leaderboard")
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err) {
      toast.error("Failed to load leaderboard")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleVisibility(entryId: string, currentHidden: boolean) {
    setTogglingId(entryId)
    try {
      const res = await fetch(`/api/admin/leaderboard/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !currentHidden }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(currentHidden ? "Entry is now visible" : "Entry is now hidden")
      fetchEntries()
    } catch (err) {
      toast.error("Failed to toggle visibility")
      console.error(err)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      const res = await fetch("/api/admin/leaderboard", {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to reset")
      toast.success("Leaderboard reset successfully")
      setResetDialogOpen(false)
      setEntries([])
    } catch (err) {
      toast.error("Failed to reset leaderboard")
      console.error(err)
    } finally {
      setResetting(false)
    }
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return <span className="ml-1 text-muted-foreground/40">↕</span>
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading leaderboard..." />
      </div>
    )
  }

  const visibleEntries = sortEntries(
    entries.filter((e) => !e.hidden),
    sortField,
    sortDir
  )
  const hiddenEntries = sortEntries(
    entries.filter((e) => e.hidden),
    sortField,
    sortDir
  )

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard Management</h1>
          <p className="mt-1 text-muted-foreground">
            Control visibility and reset leaderboard
          </p>
        </div>

        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogTrigger>
            <Button variant="destructive">Reset Leaderboard</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Leaderboard?</DialogTitle>
              <DialogDescription>
                This will permanently delete all leaderboard entries. This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setResetDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Yes, Reset All"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visible Entries */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Visible Entries ({visibleEntries.length})</CardTitle>
          <CardDescription>
            Entries shown on the public leaderboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visibleEntries.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No visible entries
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("evaluationScore")}
                  >
                    Eval Score<SortIcon field="evaluationScore" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("interviewScore")}
                  >
                    Interview Score<SortIcon field="interviewScore" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("combinedScore")}
                  >
                    Combined Score<SortIcon field="combinedScore" />
                  </TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Fastest Time</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.user.name || entry.user.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.user.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatScore(entry.evaluationScore)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatScore(entry.interviewScore)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {formatScore(entry.combinedScore)}
                    </TableCell>
                    <TableCell>{entry.submissionCount}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatTime(entry.fastestTime)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.cycleId}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === entry.id}
                        onClick={() =>
                          handleToggleVisibility(entry.id, entry.hidden)
                        }
                      >
                        Hide
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Hidden Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Hidden Entries ({hiddenEntries.length})</CardTitle>
          <CardDescription>
            Entries hidden from the public leaderboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hiddenEntries.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No hidden entries
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("evaluationScore")}
                  >
                    Eval Score<SortIcon field="evaluationScore" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("interviewScore")}
                  >
                    Interview Score<SortIcon field="interviewScore" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("combinedScore")}
                  >
                    Combined Score<SortIcon field="combinedScore" />
                  </TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Fastest Time</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hiddenEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.user.name || entry.user.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.user.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatScore(entry.evaluationScore)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatScore(entry.interviewScore)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {formatScore(entry.combinedScore)}
                    </TableCell>
                    <TableCell>{entry.submissionCount}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatTime(entry.fastestTime)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.cycleId}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === entry.id}
                        onClick={() =>
                          handleToggleVisibility(entry.id, entry.hidden)
                        }
                      >
                        Show
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
