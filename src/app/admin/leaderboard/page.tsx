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
  status: string
  hidden: boolean
  cycleId: string
  user: {
    name: string | null
    email: string
  }
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

export default function AdminLeaderboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

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

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading leaderboard..." />
      </div>
    )
  }

  const visibleEntries = entries.filter((e) => !e.hidden)
  const hiddenEntries = entries.filter((e) => e.hidden)

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
                  <TableHead>Submissions</TableHead>
                  <TableHead>Fastest Time</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>{entry.submissionCount}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatTime(entry.fastestTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {entry.status.replace(/_/g, " ")}
                      </Badge>
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
                  <TableHead>Submissions</TableHead>
                  <TableHead>Fastest Time</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>{entry.submissionCount}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatTime(entry.fastestTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {entry.status.replace(/_/g, " ")}
                      </Badge>
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
