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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import EvaluationForm from "@/components/admin/EvaluationForm"
import { toast } from "sonner"
import {
  ExternalLink,
  GitBranch,
  Globe,
  Video,
  FileText,
  Clock,
  User,
} from "lucide-react"

interface SubmissionDetail {
  id: string
  userId: string
  assignedProblemId: string
  gitUrl: string | null
  liveUrl: string | null
  architectureNotes: string | null
  aiUsageExplanation: string | null
  videoUrl: string | null
  screenshots: string[]
  submittedAt: string
  elapsedSeconds: number | null
  user: {
    id: string
    name: string | null
    email: string
    status: string
  }
  assignedProblem: {
    id: string
    status: string
    variantConfig: Record<string, unknown>
    template: {
      title: string
      slug: string
      category: string
      difficulty: number
      overview: string
      requirements: string[]
      constraints: string[]
      deliverables: string[]
      evaluationCriteria: string[]
    }
  }
  evaluations: Array<{
    id: string
    executionScore: number
    architectureScore: number
    thoughtProcessScore: number
    aiUsageScore: number
    deploymentScore: number
    codeOrganizationScore: number
    uiUxScore: number
    communicationScore: number
    totalScore: number
    notes: string | null
    status: string
    evaluator: {
      id: string
      name: string | null
      email: string
    }
    createdAt: string
  }>
}

export default function SubmissionDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchSubmission()
    }
  }, [status, session, id])

  async function fetchSubmission() {
    try {
      const res = await fetch(`/api/admin/submissions/${id}`)
      if (!res.ok) throw new Error("Failed to fetch submission")
      const data = await res.json()
      setSubmission(data.submission)
    } catch (err) {
      toast.error("Failed to load submission")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(seconds: number | null): string {
    if (!seconds) return "—"
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  if (loading || !submission) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading submission..." />
      </div>
    )
  }

  const myEval = submission.evaluations.find(
    (e) => e.evaluator.id === session?.user?.id
  )
  const otherEvals = submission.evaluations.filter(
    (e) => e.evaluator.id !== session?.user?.id
  )

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {submission.assignedProblem.template.title}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Submission by {submission.user.name || submission.user.email}
            </p>
          </div>
          <Link href={`/admin/candidates/${submission.user.id}`}>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-1" />
              View Candidate
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Submission Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submission Info */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
              <CardDescription>
                Submitted {new Date(submission.submittedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Elapsed:</span>
                  <span className="font-medium">
                    {formatTime(submission.elapsedSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">
                    {submission.assignedProblem.template.category}
                  </Badge>
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span className="font-medium">
                    {submission.assignedProblem.template.difficulty}/5
                  </span>
                </div>
              </div>

              <Separator />

              {/* Links */}
              <div className="space-y-2">
                {submission.gitUrl && (
                  <a
                    href={submission.gitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <GitBranch className="h-4 w-4" />
                    Repository: {submission.gitUrl}
                  </a>
                )}
                {submission.liveUrl && (
                  <a
                    href={submission.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Live Deployment: {submission.liveUrl}
                  </a>
                )}
                {submission.videoUrl && (
                  <a
                    href={submission.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Video className="h-4 w-4" />
                    Demo Video
                  </a>
                )}
              </div>

              {/* Architecture Notes */}
              {submission.architectureNotes && (
                <div>
                  <h3 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Architecture Notes
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {submission.architectureNotes}
                  </p>
                </div>
              )}

              {/* AI Usage */}
              {submission.aiUsageExplanation && (
                <div>
                  <h3 className="text-sm font-medium mb-1">AI Usage Explanation</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {submission.aiUsageExplanation}
                  </p>
                </div>
              )}

              {/* Screenshots */}
              {submission.screenshots && submission.screenshots.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Screenshots</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {submission.screenshots.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video rounded-lg border border-border bg-muted overflow-hidden hover:border-primary transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Problem Details */}
          <Card>
            <CardHeader>
              <CardTitle>Problem: {submission.assignedProblem.template.title}</CardTitle>
              <CardDescription>
                {submission.assignedProblem.template.overview.substring(0, 200)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Requirements</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {submission.assignedProblem.template.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Evaluation Criteria</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {submission.assignedProblem.template.evaluationCriteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Other Evaluations */}
          {otherEvals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Other Evaluations</CardTitle>
                <CardDescription>
                  {otherEvals.length} evaluation(s) by other admins
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {otherEvals.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {ev.evaluator.name || ev.evaluator.email}
                      </span>
                      <Badge>{ev.totalScore}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Execution: {ev.executionScore}/10</span>
                      <span>Architecture: {ev.architectureScore}/10</span>
                      <span>Thought Process: {ev.thoughtProcessScore}/10</span>
                      <span>AI Usage: {ev.aiUsageScore}/10</span>
                      <span>Deployment: {ev.deploymentScore}/10</span>
                      <span>Code Org: {ev.codeOrganizationScore}/10</span>
                      <span>UI/UX: {ev.uiUxScore}/10</span>
                      <span>Communication: {ev.communicationScore}/10</span>
                    </div>
                    {ev.notes && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {ev.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Evaluation Form */}
        <div>
          <EvaluationForm
            submissionId={submission.id}
            initialData={myEval ? {
              id: myEval.id,
              executionScore: myEval.executionScore,
              architectureScore: myEval.architectureScore,
              thoughtProcessScore: myEval.thoughtProcessScore,
              aiUsageScore: myEval.aiUsageScore,
              deploymentScore: myEval.deploymentScore,
              codeOrganizationScore: myEval.codeOrganizationScore,
              uiUxScore: myEval.uiUxScore,
              communicationScore: myEval.communicationScore,
              totalScore: myEval.totalScore,
              notes: myEval.notes,
            } : undefined}
            onComplete={() => {
              fetchSubmission()
            }}
          />
        </div>
      </div>
    </div>
  )
}
