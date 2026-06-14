"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

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

const VALID_TRANSITIONS: Record<string, string[]> = {
  REGISTERED: ["ASSESSMENT_COMPLETED"],
  ASSESSMENT_COMPLETED: ["PROBLEM_ASSIGNED"],
  PROBLEM_ASSIGNED: ["IN_PROGRESS", "SUBMITTED"],
  IN_PROGRESS: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["SELECTED", "REJECTED"],
  REJECTED: [],
  SELECTED: [],
}

interface CandidateDetail {
  id: string
  name: string | null
  email: string
  status: string
  phone: string | null
  college: string | null
  resumeUrl: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  createdAt: string
  skillProfiles: Array<{
    id: string
    scores: Record<string, number>
    topSkills: string[]
    generatedAt: string
  }>
  assessmentResponses: Array<{
    id: string
    responseValue: unknown
    question: {
      id: string
      questionText: string
      category: string
      questionType: string
    }
  }>
  assignedProblems: Array<{
    id: string
    status: string
    template: {
      title: string
      category: string
      difficulty: number
    }
    assignedAt: string
    deadline: string | null
    submissions: Array<{
      id: string
      submittedAt: string
      elapsedSeconds: number | null
      evaluations: Array<{
        id: string
        totalScore: number
        status: string
      }>
    }>
  }>
  evaluations: Array<{
    id: string
    totalScore: number
    status: string
    notes: string | null
    evaluator: { name: string | null; email: string }
    createdAt: string
  }>
  auditLogs: Array<{
    id: string
    action: string
    metadata: Record<string, unknown>
    createdAt: string
  }>
  candidateInterviews?: Array<{
    id: string
    status: string
    scheduledAt: string
    duration: number
    timezone: string
    overallScore: number | null
    evaluatorNotes: string | null
    scoredAt: string | null
    evaluator: { id: string; name: string | null; email: string } | null
    interviewEvaluators: Array<{
      id: string
      role: string
      user: { id: string; name: string | null; email: string }
    }>
    interviewScores: Array<{
      id: string
      score: number
      notes: string | null
      evaluator: { id: string; name: string | null; email: string }
      dimension: { id: string; name: string; maxScore: number; weight: number }
    }>
  }>
}

export default function CandidateDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchCandidate()
    }
  }, [status, session, id])

  async function fetchCandidate() {
    try {
      const res = await fetch(`/api/admin/candidates/${id}`)
      if (!res.ok) throw new Error("Failed to fetch candidate")
      const data = await res.json()
      setCandidate(data.candidate)
    } catch (err) {
      toast.error("Failed to load candidate")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/candidates/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || data.message || "Failed to update status")
      }
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ").toLowerCase()}`)
      fetchCandidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading || !candidate) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading candidate..." />
      </div>
    )
  }

  const latestSkills = candidate.skillProfiles[0]

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {candidate.name || "Unnamed Candidate"}
            </h1>
            <p className="mt-1 text-muted-foreground">{candidate.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              className={`text-sm px-3 py-1 ${
                STATUS_COLORS[candidate.status] || ""
              }`}
            >
              {candidate.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              {candidate.phone || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">College:</span>{" "}
              {candidate.college || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Registered:</span>{" "}
              {new Date(candidate.createdAt).toLocaleDateString()}
            </div>
            <div className="flex flex-col gap-1">
              {candidate.githubUrl && (
                <a
                  href={candidate.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub Profile
                </a>
              )}
              {candidate.linkedinUrl && (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  LinkedIn Profile
                </a>
              )}
              {candidate.resumeUrl && (
                <a
                  href={candidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Resume
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card>
          <CardHeader>
            <CardTitle>Status Management</CardTitle>
            <CardDescription>
              Transition candidate through pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(VALID_TRANSITIONS[candidate.status] || []).map((nextStatus) => (
                <Button
                  key={nextStatus}
                  variant="outline"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(nextStatus)}
                >
                  Move to {nextStatus.replace(/_/g, " ").toLowerCase()}
                </Button>
              ))}
              {(VALID_TRANSITIONS[candidate.status] || []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No transitions available from {candidate.status.replace(/_/g, " ").toLowerCase()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skill Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Profile</CardTitle>
            <CardDescription>
              {latestSkills
                ? `Generated ${new Date(latestSkills.generatedAt).toLocaleDateString()}`
                : "No assessment completed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestSkills ? (
              <div className="space-y-3">
                {latestSkills.topSkills.slice(0, 5).map((skill) => (
                  <div key={skill} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">
                        {skill.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="font-medium">
                        {latestSkills.scores[skill] ?? 0}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${latestSkills.scores[skill] ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {latestSkills.topSkills.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{latestSkills.topSkills.length - 5} more skills
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No skill profile available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assessment Responses */}
      {candidate.assessmentResponses.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assessment Responses</CardTitle>
            <CardDescription>
              {candidate.assessmentResponses.length} questions answered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidate.assessmentResponses.slice(0, 10).map((resp) => (
                <div key={resp.id} className="text-sm">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 mt-0.5 text-[10px]">
                      {resp.question.category}
                    </Badge>
                    <div>
                      <p className="font-medium">{resp.question.questionText}</p>
                      <p className="text-muted-foreground mt-0.5">
                        Response: {String(resp.responseValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {candidate.assessmentResponses.length > 10 && (
                <p className="text-sm text-muted-foreground">
                  +{candidate.assessmentResponses.length - 10} more responses
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Problems */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assigned Problems</CardTitle>
          <CardDescription>
            {candidate.assignedProblems.length} problem(s) assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidate.assignedProblems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No problems assigned</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Submission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidate.assignedProblems.map((ap) => (
                  <TableRow key={ap.id}>
                    <TableCell className="font-medium">
                      {ap.template.title}
                    </TableCell>
                    <TableCell>{ap.template.category}</TableCell>
                    <TableCell>{ap.template.difficulty}/5</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ap.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(ap.assignedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {ap.submissions.length > 0 ? (
                        <Link href={`/admin/submissions/${ap.submissions[0].id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Evaluations */}
      {candidate.evaluations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Evaluations</CardTitle>
            <CardDescription>
              {candidate.evaluations.length} evaluation(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluator</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidate.evaluations.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      {ev.evaluator.name || ev.evaluator.email}
                    </TableCell>
                    <TableCell className="font-medium">{ev.totalScore}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ev.status === "COMPLETED" ? "default" : "secondary"
                        }
                      >
                        {ev.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(ev.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {ev.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Interviews */}
      {candidate.candidateInterviews && candidate.candidateInterviews.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Interviews
            </CardTitle>
            <CardDescription>
              {candidate.candidateInterviews.length} interview(s) — scores from multiple evaluators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidate.candidateInterviews.map((iv) => {
              // Group scores by evaluator
              const byEvaluator: Record<string, { name: string; scores: { dim: string; score: number; max: number }[] }> = {}
              for (const s of iv.interviewScores) {
                const key = s.evaluator.id
                if (!byEvaluator[key]) {
                  byEvaluator[key] = { name: s.evaluator.name || s.evaluator.email, scores: [] }
                }
                byEvaluator[key].scores.push({
                  dim: s.dimension.name,
                  score: s.score,
                  max: s.dimension.maxScore,
                })
              }

              return (
                <div key={iv.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {new Date(iv.scheduledAt).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </span>
                      <Badge variant={iv.status === "COMPLETED" ? "default" : iv.status === "CANCELLED" ? "destructive" : "secondary"}>
                        {iv.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {iv.overallScore !== null && (
                        <span className="text-sm font-bold">
                          Score: {iv.overallScore}
                          <span className="text-xs text-muted-foreground font-normal">/100</span>
                        </span>
                      )}
                      {iv.status === "SCHEDULED" && (
                        <Link href={`/admin/interviews/${iv.id}/helper`}>
                          <Button size="sm" variant="outline" className="text-xs h-7">
                            Score
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Evaluators */}
                  <div className="text-xs text-muted-foreground mb-2">
                    Evaluators:{" "}
                    {iv.interviewEvaluators.map((ie) => ie.user.name || ie.user.email).join(", ")}
                  </div>

                  {/* Per-evaluator scores */}
                  {Object.entries(byEvaluator).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(byEvaluator).map(([evaluatorId, data]) => (
                        <div key={evaluatorId} className="rounded bg-muted/30 p-2">
                          <p className="text-xs font-medium mb-1">{data.name}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {data.scores.map((s, i) => (
                              <div key={i} className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground truncate">{s.dim}:</span>
                                <span className="font-medium">{s.score}/{s.max}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {iv.evaluatorNotes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Notes: {iv.evaluatorNotes}
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      {candidate.auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Status changes and system activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidate.auditLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {log.action.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {JSON.stringify(log.metadata).substring(0, 100)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
