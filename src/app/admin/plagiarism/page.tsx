"use client"

import { useState, useEffect, useCallback } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import {
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Users,
  Flag,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlagiarismResult {
  pairId: string
  submissionA: {
    id: string
    userId: string
    userName: string | null
    userEmail: string
    content: string
  }
  submissionB: {
    id: string
    userId: string
    userName: string | null
    userEmail: string
    content: string
  }
  similarity: number
  flagged: boolean
}

interface SimilarityMatrixEntry {
  submissionId: string
  userName: string | null
  userEmail: string
  scores: Record<string, number>
}

interface CycleInfo {
  id: string
  name: string
}

interface ProblemInfo {
  id: string
  title: string
  slug: string
}

interface PlagiarismReport {
  totalSubmissions: number
  comparisonsRun: number
  flaggedPairs: PlagiarismResult[]
  matrix: SimilarityMatrixEntry[]
  filter: {
    cycleId: string | null
    problemId: string | null
  }
  problemInfo: {
    problemTemplateId: string
    problemTitle: string
    problemSlug: string
  } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function similarityColor(sim: number): string {
  if (sim >= 0.7) return "bg-red-950/40 text-red-400"
  if (sim >= 0.3) return "bg-amber-950/40 text-amber-400"
  return "bg-emerald-950/40 text-emerald-400"
}

function similarityBg(sim: number): string {
  if (sim >= 0.7) return "bg-red-500/20"
  if (sim >= 0.3) return "bg-amber-500/20"
  return "bg-emerald-500/20"
}

function formatSimilarity(sim: number): string {
  return `${Math.round(sim * 100)}%`
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PlagiarismDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [cycles, setCycles] = useState<CycleInfo[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>("")
  const [data, setData] = useState<PlagiarismReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set())
  const [flaggedForReview, setFlaggedForReview] = useState<Set<string>>(new Set())

  // Fetch available cycles on mount
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
      fetchCycles()
    }
  }, [status, session, router])

  async function fetchCycles() {
    try {
      const res = await fetch("/api/admin/plagiarism/cycles")
      if (!res.ok) {
        // If the cycles endpoint doesn't exist, try getting cycles from leaderboard
        const lbRes = await fetch("/api/admin/analytics")
        if (lbRes.ok) {
          // Fallback: use leaderboard entries to find cycles
          const cycRes = await fetch(
            "/api/admin/plagiarism?cycleId=__list__"
          ).catch(() => null)
          if (!cycRes) {
            // Last resort: create a manual list from leaderboard
            const lbEntries = await prismaFetch<{ cycleId: string }[]>(
              "/api/admin/leaderboard/cycles"
            ).catch(() => null)
            if (lbEntries) {
              const uniqueCycles = [
                ...new Set(lbEntries.map((e: { cycleId: string }) => e.cycleId)),
              ]
              setCycles(
                uniqueCycles.map((id: string) => ({ id, name: `Cycle ${id.slice(0, 8)}` }))
              )
              return
            }
          }
        }
        return
      }
      const json = await res.json()
      setCycles(json as CycleInfo[])
    } catch {
      // Silently fail — user will see the dropdown is empty
    }
  }

  // Helper to get unique cycles from leaderboard entries
  // We fetch cycles directly from the leaderboard_entry table
  useEffect(() => {
    if (cycles.length === 0 && status === "authenticated") {
      // Also try to discover cycles from leaderboard via a direct query
      fetch("/api/admin/plagiarism/cycles")
        .then((r) => {
          if (r.ok) return r.json()
          throw new Error("No cycles endpoint")
        })
        .then((json: CycleInfo[]) => setCycles(json))
        .catch(() => {
          // Cycles endpoint may not exist, offer a fallback
          setCycles([{ id: "all", name: "All Cycles (Legacy)" }])
        })
    }
  }, [cycles.length, status])

  // ── Fetch plagiarism data ─────────────────────────────────────────────────

  const fetchPlagiarismData = useCallback(async () => {
    if (!selectedCycleId) {
      toast.error("Please select a cycle first")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("cycleId", selectedCycleId)

      const res = await fetch(`/api/admin/plagiarism?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error || "Failed to fetch plagiarism data"
        )
      }
      const json = await res.json()
      setData(json as PlagiarismReport)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      toast.error(message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [selectedCycleId])

  // ── Toggle pair expansion ─────────────────────────────────────────────────

  function togglePair(pairId: string) {
    setExpandedPairs((prev) => {
      const next = new Set(prev)
      if (next.has(pairId)) {
        next.delete(pairId)
      } else {
        next.add(pairId)
      }
      return next
    })
  }

  // ── Toggle flag for review ────────────────────────────────────────────────

  function toggleFlag(pairId: string) {
    setFlaggedForReview((prev) => {
      const next = new Set(prev)
      if (next.has(pairId)) {
        next.delete(pairId)
      } else {
        next.add(pairId)
      }
      return next
    })
    toast.success(
      flaggedForReview.has(pairId)
        ? "Removed from review list"
        : "Pair flagged for review"
    )
  }

  // ── Loading / Auth guards ─────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    )
  }

  if (session?.user?.role !== "ADMIN") return null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-primary" />
            Plagiarism Detection
          </h1>
          <p className="mt-1 text-muted-foreground text-sm font-mono">
            Compare submissions using text similarity analysis
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPlagiarismData}
          disabled={loading || !selectedCycleId}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Scanning..." : "Run Analysis"}
        </Button>
      </div>

      {/* ── Cycle Selector ──────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono text-muted-foreground">
                Select Cycle
              </span>
            </div>
            <Select value={selectedCycleId || null} onValueChange={(val) => setSelectedCycleId(val ?? "")}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose a cycle..." />
              </SelectTrigger>
              <SelectContent>
                {cycles.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No cycles available
                  </SelectItem>
                ) : (
                  cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {data && (
              <div className="flex items-center gap-4 ml-auto">
                <Badge variant="secondary" className="font-mono">
                  <FileText className="h-3 w-3 mr-1" />
                  {data.totalSubmissions} submissions
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  <Users className="h-3 w-3 mr-1" />
                  {data.comparisonsRun} comparisons
                </Badge>
                {data.flaggedPairs.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="font-mono bg-red-950/40 text-red-400"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {data.flaggedPairs.length} flagged
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Error State ────────────────────────────────────────────────────── */}
      {error && !data && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive/60" />
          <p className="text-destructive text-sm font-mono">{error}</p>
          <Button variant="outline" onClick={fetchPlagiarismData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* ── Loading State ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner text="Running pairwise comparison..." />
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Problem Info */}
          {data.problemInfo && (
            <Card size="sm">
              <CardContent className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-muted-foreground">
                  Problem:
                </span>
                <span className="font-medium">{data.problemInfo.problemTitle}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {data.problemInfo.problemSlug}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* ── Similarity Matrix ────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Similarity Matrix
              </CardTitle>
              <CardDescription>
                Color-coded pairwise similarity scores &mdash; green (
                {formatSimilarity(0)}-{formatSimilarity(0.3)}), amber (
                {formatSimilarity(0.3)}-{formatSimilarity(0.7)}), red (
                {formatSimilarity(0.7)}-{formatSimilarity(1)})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.matrix.length === 0 ? (
                <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                  No submissions to compare
                </p>
              ) : data.matrix.length > 20 ? (
                <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                  Matrix too large to display ({data.matrix.length} submissions).
                  Review the flagged pairs below.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs min-w-[160px]">
                          Submission
                        </TableHead>
                        {data.matrix.map((entry) => (
                          <TableHead
                            key={entry.submissionId}
                            className="font-mono text-xs text-center min-w-[80px] max-w-[100px] truncate"
                          >
                            <span className="truncate block max-w-[80px]">
                              {entry.userName || entry.userEmail.split("@")[0]}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.matrix.map((row, rowIdx) => (
                        <TableRow key={row.submissionId}>
                          <TableCell className="font-mono text-xs font-medium truncate max-w-[160px]">
                            <span className="truncate block">
                              {row.userName || row.userEmail.split("@")[0]}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {row.userEmail}
                            </span>
                          </TableCell>
                          {data.matrix.map((col) => {
                            const sim = row.scores[col.submissionId]
                            const isSelf = row.submissionId === col.submissionId
                            return (
                              <TableCell
                                key={col.submissionId}
                                className={`text-center font-mono text-xs p-1 ${
                                  isSelf ? "bg-muted/30" : similarityBg(sim ?? 0)
                                }`}
                              >
                                {isSelf ? (
                                  <span className="text-muted-foreground/30">
                                    &mdash;
                                  </span>
                                ) : sim !== undefined ? (
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded ${
                                      sim >= 0.7
                                        ? "bg-red-500/30 text-red-300 font-bold"
                                        : sim >= 0.3
                                          ? "bg-amber-500/30 text-amber-300"
                                          : "bg-emerald-500/30 text-emerald-300"
                                    }`}
                                  >
                                    {formatSimilarity(sim)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">
                                    &mdash;
                                  </span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Flagged Pairs ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Flagged Pairs
                {data.flaggedPairs.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-red-950/40 text-red-400 font-mono"
                  >
                    {data.flaggedPairs.length} suspicious
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Submission pairs with similarity above {formatSimilarity(0.7)}.
                Expand to compare content side-by-side.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.flaggedPairs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <ShieldAlert className="h-10 w-10 text-emerald-500/60" />
                  <p className="text-sm text-emerald-400 font-mono">
                    No suspicious pairs detected
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    All {data.totalSubmissions} submissions appear original
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.flaggedPairs.map((pair) => {
                    const isExpanded = expandedPairs.has(pair.pairId)
                    const isFlagged = flaggedForReview.has(pair.pairId)

                    return (
                      <Card key={pair.pairId} size="sm">
                        <CardContent className="pt-3">
                          {/* Pair Summary */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Badge
                                className={`font-mono text-xs ${
                                  pair.similarity >= 0.9
                                    ? "bg-red-500/80 text-white"
                                    : similarityColor(pair.similarity)
                                }`}
                              >
                                {formatSimilarity(pair.similarity)}
                              </Badge>
                              <div className="flex items-center gap-2 text-sm min-w-0">
                                <span className="font-mono truncate max-w-[120px]">
                                  {pair.submissionA.userName ||
                                    pair.submissionA.userEmail.split("@")[0]}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  vs
                                </span>
                                <span className="font-mono truncate max-w-[120px]">
                                  {pair.submissionB.userName ||
                                    pair.submissionB.userEmail.split("@")[0]}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono hidden sm:inline truncate">
                                ({pair.submissionA.userEmail}, {pair.submissionB.userEmail})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFlag(pair.pairId)}
                                className={
                                  isFlagged
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }
                              >
                                <Flag
                                  className={`h-4 w-4 ${
                                    isFlagged ? "fill-destructive" : ""
                                  }`}
                                />
                                <span className="ml-1 text-xs hidden sm:inline">
                                  {isFlagged ? "Flagged" : "Flag"}
                                </span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePair(pair.pairId)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                <span className="ml-1 text-xs hidden sm:inline">
                                  {isExpanded ? "Hide" : "Compare"}
                                </span>
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Content Comparison */}
                          {isExpanded && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                              {/* Submission A */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    A
                                  </Badge>
                                  <span className="text-xs font-mono font-medium truncate">
                                    {pair.submissionA.userName ||
                                      pair.submissionA.userEmail}
                                  </span>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                                  {pair.submissionA.content || (
                                    <span className="text-muted-foreground italic">
                                      No content
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Submission B */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    B
                                  </Badge>
                                  <span className="text-xs font-mono font-medium truncate">
                                    {pair.submissionB.userName ||
                                      pair.submissionB.userEmail}
                                  </span>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                                  {pair.submissionB.content || (
                                    <span className="text-muted-foreground italic">
                                      No content
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Stats Summary ────────────────────────────────────────────────── */}
          <Card size="sm">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                <span>
                  Total Submissions:{" "}
                  <span className="text-foreground font-medium">
                    {data.totalSubmissions}
                  </span>
                </span>
                <span>
                  Comparisons Run:{" "}
                  <span className="text-foreground font-medium">
                    {data.comparisonsRun}
                  </span>
                </span>
                <span>
                  Flagged:{" "}
                  <span className="text-destructive font-medium">
                    {data.flaggedPairs.length}
                  </span>
                </span>
                <span>
                  Flagged for Review:{" "}
                  <span className="text-foreground font-medium">
                    {flaggedForReview.size}
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPlagiarismData}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Empty / Initial State ──────────────────────────────────────────── */}
      {!data && !loading && !error && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <ShieldAlert className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground font-mono">
            Select a cycle and click &quot;Run Analysis&quot; to start
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Helper to fetch JSON ────────────────────────────────────────────────────

async function prismaFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json() as Promise<T>
}
