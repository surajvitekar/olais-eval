"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import EvaluationForm from "@/components/admin/EvaluationForm"
import {
  EVALUATION_DIMENSIONS,
  getPerformanceLabel,
  getPerformanceColor,
  EVALUATION_RUBRIC,
} from "@/lib/evaluations/scoring"
import type { DimensionWeights, DimensionKey } from "@/lib/evaluations/scoring"
import { toast } from "sonner"
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ClipboardList,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface PendingSubmission {
  id: string
  candidateName: string
  candidateId: string
  problemTitle: string
  problemSlug: string
  category: string
  submittedAt: string
}

interface CompletedEvaluation {
  id: string
  submissionId: string
  evaluatorId: string
  totalScore: number
  executionScore: number
  architectureScore: number
  thoughtProcessScore: number
  aiUsageScore: number
  deploymentScore: number
  codeOrganizationScore: number
  uiUxScore: number
  communicationScore: number
  notes: string | null
  status: string
  createdAt: string
  submission: {
    id: string
    submittedAt: string
    user: { id: string; name: string | null; email: string }
    assignedProblem: {
      template: { title: string; slug: string }
    }
  }
  evaluator: { id: string; name: string | null; email: string }
}

export default function AdminEvaluationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([])
  const [completedEvaluations, setCompletedEvaluations] = useState<CompletedEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [weights, setWeights] = useState<DimensionWeights | null>(null)
  const [passingScore, setPassingScore] = useState(60)
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null)
  const [showRubricGuide, setShowRubricGuide] = useState(false)
  const [expandedEval, setExpandedEval] = useState<string | null>(null)

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
      fetchData()
    }
  }, [status, session, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.set("status", filterStatus)
      params.set("includePendingSubmissions", "true")

      const res = await fetch(`/api/admin/evaluations?${params}`)
      if (!res.ok) throw new Error("Failed to fetch evaluations")
      const data = await res.json()

      setCompletedEvaluations(data.evaluations || [])
      setPendingSubmissions(data.pendingSubmissions || [])
      if (data.weights) setWeights(data.weights)
      if (data.passingScore) setPassingScore(data.passingScore)
    } catch (err) {
      toast.error("Failed to load evaluations")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    if (status === "authenticated") {
      fetchData()
    }
  }, [fetchData, status])

  // Filter evaluations by search query
  const filteredCompleted = completedEvaluations.filter((ev) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const userName = ev.submission?.user?.name?.toLowerCase() || ""
    const userEmail = ev.submission?.user?.email?.toLowerCase() || ""
    const problemTitle = ev.submission?.assignedProblem?.template?.title?.toLowerCase() || ""
    return userName.includes(q) || userEmail.includes(q) || problemTitle.includes(q)
  })

  // Filter pending by search query
  const filteredPending = pendingSubmissions.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.candidateName.toLowerCase().includes(q) ||
      s.problemTitle.toLowerCase().includes(q)
    )
  })

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading evaluations..." />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
        <p className="mt-1 text-muted-foreground">
          Review and score candidate submissions across 8 dimensions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </p>
                <p className="text-3xl font-bold mt-1">{pendingSubmissions.length}</p>
              </div>
              <div className="rounded-xl p-3 bg-orange-50 dark:bg-orange-950/30">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completed
                </p>
                <p className="text-3xl font-bold mt-1">{completedEvaluations.length}</p>
              </div>
              <div className="rounded-xl p-3 bg-green-50 dark:bg-green-950/30">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pass Threshold
                </p>
                <p className="text-3xl font-bold mt-1">{passingScore}</p>
              </div>
              <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-950/30">
                <AlertTriangle className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evaluation Form Panel */}
      {selectedSubmission && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Evaluating: {selectedSubmission.candidateName}</CardTitle>
                <CardDescription>
                  {selectedSubmission.problemTitle} &middot;{" "}
                  Submitted {new Date(selectedSubmission.submittedAt).toLocaleString()}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSubmission(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {/* Link to full submission */}
                <div className="flex gap-2">
                  <Link href={`/admin/submissions/${selectedSubmission.id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      View Full Submission
                    </Button>
                  </Link>
                  <Link href={`/admin/candidates/${selectedSubmission.candidateId}`}>
                    <Button variant="outline" size="sm">
                      View Candidate Profile
                    </Button>
                  </Link>
                </div>

                {/* Rubric Guide */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRubricGuide(!showRubricGuide)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ClipboardList className="h-4 w-4" />
                    {showRubricGuide ? "Hide" : "Show"} Evaluation Rubric Guide
                    {showRubricGuide ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  {showRubricGuide && (
                    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      {EVALUATION_RUBRIC.map((rubric) => (
                        <div key={rubric.key}>
                          <h4 className="text-sm font-semibold mb-1">{rubric.label}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {rubric.levels.map((level) => (
                              <div
                                key={level.label}
                                className="rounded border border-border bg-background p-2 text-xs"
                              >
                                <Badge variant="outline" className="mb-1 text-[10px]">
                                  {level.label} ({level.range[0]}-{level.range[1]})
                                </Badge>
                                <p className="text-muted-foreground">{level.criteria}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <EvaluationForm
                  submissionId={selectedSubmission.id}
                  onComplete={() => {
                    setSelectedSubmission(null)
                    fetchData()
                  }}
                  weights={weights || undefined}
                  showRubric={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidate or problem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Select
                value={filterStatus}
                onValueChange={(v) => { if (v !== null) setFilterStatus(v) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All evaluations</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Submissions */}
      {filteredPending.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Review ({filteredPending.length})
            </CardTitle>
            <CardDescription>
              Submissions awaiting evaluation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.candidateName}
                    </TableCell>
                    <TableCell>{sub.problemTitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sub.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatTime(sub.submittedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        Evaluate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Completed Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Completed Evaluations ({filteredCompleted.length})
          </CardTitle>
          <CardDescription>
            All evaluations with weighted scores and performance labels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCompleted.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No evaluations found
            </p>
          ) : (
            <div className="space-y-3">
              {filteredCompleted.map((ev) => {
                const label = getPerformanceLabel(ev.totalScore)
                const color = getPerformanceColor(ev.totalScore)
                const isExpanded = expandedEval === ev.id

                return (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    {/* Compact row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() =>
                        setExpandedEval(isExpanded ? null : ev.id)
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {ev.submission?.user?.name || ev.submission?.user?.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ev.submission?.assignedProblem?.template?.title}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {ev.evaluator?.name || ev.evaluator?.email}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-lg font-bold tabular-nums">
                          {ev.totalScore}
                        </span>
                        <Badge className={color}>{label}</Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border">
                        <div className="pt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {EVALUATION_DIMENSIONS.map((dim) => {
                            const scoreValue =
                              ev[dim.key as keyof typeof ev] as number | undefined
                            return (
                              <div
                                key={dim.key}
                                className="flex items-center justify-between"
                              >
                                <span className="text-muted-foreground">
                                  {dim.label}
                                </span>
                                <span className="font-medium tabular-nums">
                                  {scoreValue ?? "—"} / 10
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {ev.notes && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                              <span className="text-xs font-medium">Notes: </span>
                              {ev.notes}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                          <div className="flex gap-2">
                            <Link
                              href={`/admin/submissions/${ev.submissionId}`}
                            >
                              <Button variant="outline" size="sm">
                                <FileText className="h-3 w-3 mr-1" />
                                View Submission
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
