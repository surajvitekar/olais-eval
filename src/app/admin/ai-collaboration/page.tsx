"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { toast } from "sonner"
import {
  Brain,
  Search,
  MessageSquare,
  Wrench,
  Lightbulb,
  BarChart3,
  Target,
  Users,
  Layers,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react"

// ─── Types matching the API response ──────────────────────────────────────

interface AICollaborationReport {
  submissionId: string
  declaration: {
    tools: string[]
    helpDescription: string
    manualWork: string
    reasoning: string
    prompts: string
  } | null
  promptAnalysis: {
    promptCount: number
    prompts: string[]
    specificity: number
    context: number
    intent: number
    quality: number
    qualityRationale: string
  }
  categorizedPrompts: Array<{
    text: string
    category: string
    confidence: number
  }>
  toolUsageInsights: Array<{
    tool: string
    category: string
    frequency: number
    notes: string
  }>
  insights: Array<{
    type: "strength" | "opportunity" | "observation"
    category: string
    message: string
    detail: string
  }>
  overallScore: number
  scoreBreakdown: {
    promptQuality: { score: number; max: number; specifics: string[] }
    toolUsage: { score: number; max: number; specifics: string[] }
    collaborationDepth: { score: number; max: number; specifics: string[] }
    selfAwareness: { score: number; max: number; specifics: string[] }
    reasoningQuality: { score: number; max: number; specifics: string[] }
  }
  label: string
  analyzedAt: string
}

interface Metadata {
  candidateName: string | null
  candidateEmail: string
  problemTitle: string
  problemCategory: string
  problemDifficulty: number
  submittedAt: string
  evaluatorAiUsageScore: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 80) return "bg-green-500"
  if (pct >= 60) return "bg-blue-500"
  if (pct >= 40) return "bg-yellow-500"
  return "bg-red-500"
}

function getScoreLabel(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 80) return "Excellent"
  if (pct >= 60) return "Good"
  if (pct >= 40) return "Fair"
  return "Needs Improvement"
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    architecture: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    code: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    debugging: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    verification: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  }
  return colors[category] || colors.other
}

function getInsightIcon(type: string) {
  switch (type) {
    case "strength":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
    case "opportunity":
      return <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
    default:
      return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
  }
}

function getOverallColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400"
  if (score >= 60) return "text-blue-600 dark:text-blue-400"
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

// ─── Page Component ───────────────────────────────────────────────────────

export default function AICollaborationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [submissionId, setSubmissionId] = useState("")
  const [report, setReport] = useState<AICollaborationReport | null>(null)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  // Check for submissionId in URL query params
  useEffect(() => {
    const sid = searchParams?.get("submissionId")
    if (sid) {
      setSubmissionId(sid)
      fetchAnalysis(sid)
    }
  }, [searchParams])

  async function fetchAnalysis(sid?: string) {
    const id = sid || submissionId
    if (!id.trim()) {
      toast.error("Please enter a submission ID")
      return
    }

    setLoading(true)
    setFetched(false)
    try {
      const res = await fetch(`/api/admin/ai-collaboration/${encodeURIComponent(id.trim())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setReport(data.analysis)
      setMetadata(data.metadata)
      setFetched(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch analysis")
      setReport(null)
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    fetchAnalysis()
  }

  // Auth check
  if (status === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    )
  }

  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    router.push("/login")
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          AI Collaboration Analysis
        </h1>
        <p className="mt-1 text-muted-foreground">
          Evaluate HOW candidates used AI — not just whether they did.
          This is about AI partnership skills, not cheating detection.
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Submission
          </CardTitle>
          <CardDescription>
            Enter a submission ID to analyze the candidate&apos;s AI collaboration patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Submission ID (e.g., cm0abc123...)"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner text="Running AI collaboration analysis..." />
        </div>
      )}

      {/* No Results */}
      {fetched && !report && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No analysis data available for this submission.</p>
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {report && metadata && (
        <div className="space-y-6">
          {/* Candidate & Problem Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Candidate</p>
                  <p className="text-sm font-medium mt-1">{metadata.candidateName || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{metadata.candidateEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Problem</p>
                  <p className="text-sm font-medium mt-1">{metadata.problemTitle}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {metadata.problemCategory}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Difficulty</p>
                  <p className="text-sm font-medium mt-1">{metadata.problemDifficulty}/5</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Submitted</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(metadata.submittedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(metadata.submittedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Score */}
          <Card className="overflow-hidden">
            <div className={`p-6 text-center ${getOverallColor(report.overallScore)}`}>
              <p className="text-xs uppercase tracking-wider mb-1 opacity-70">AI Collaboration Score</p>
              <p className="text-6xl font-extrabold">{Math.round(report.overallScore)}</p>
              <p className="text-lg font-semibold mt-1">{report.label}</p>
              {metadata.evaluatorAiUsageScore !== null && (
                <p className="text-xs mt-2 opacity-60">
                  Evaluator AI Usage Score: {metadata.evaluatorAiUsageScore}/10
                </p>
              )}
            </div>
          </Card>

          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Score Breakdown
              </CardTitle>
              <CardDescription>
                Detailed breakdown of the AI Collaboration Score dimensions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(report.scoreBreakdown).map(([key, dim]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-sm font-semibold">
                      {dim.score}/{dim.max}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({getScoreLabel(dim.score, dim.max)})
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreColor(dim.score, dim.max)}`}
                      style={{ width: `${(dim.score / dim.max) * 100}%` }}
                    />
                  </div>
                  {dim.specifics.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {dim.specifics.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-primary mt-0.5">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Prompt Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Prompt Analysis
              </CardTitle>
              <CardDescription>
                {report.promptAnalysis.promptCount} prompt(s) detected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quality Overview */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{formatPercent(report.promptAnalysis.specificity)}</p>
                  <p className="text-xs text-muted-foreground">Specificity</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{formatPercent(report.promptAnalysis.context)}</p>
                  <p className="text-xs text-muted-foreground">Context</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{formatPercent(report.promptAnalysis.intent)}</p>
                  <p className="text-xs text-muted-foreground">Intent</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{formatPercent(report.promptAnalysis.quality)}</p>
                  <p className="text-xs text-muted-foreground">Overall Quality</p>
                </div>
              </div>

              {/* Rationale */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-700 dark:text-blue-300">
                <p>{report.promptAnalysis.qualityRationale}</p>
              </div>

              {/* Raw Prompts */}
              {report.promptAnalysis.prompts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Prompts</h4>
                  <div className="space-y-2">
                    {report.promptAnalysis.prompts.map((p, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-card p-3 text-sm font-mono"
                      >
                        <Badge variant="outline" className="mb-1 text-[10px]">
                          Prompt {i + 1}
                        </Badge>
                        <p className="whitespace-pre-wrap text-xs">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categorized Prompts */}
          {report.categorizedPrompts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Prompt Categories
                </CardTitle>
                <CardDescription>
                  How prompts sorted by type of AI interaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.categorizedPrompts.map((cp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{cp.text}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge className={getCategoryColor(cp.category)}>
                          {cp.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(cp.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tools Used */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Tools Used
              </CardTitle>
              <CardDescription>
                {report.declaration?.tools?.length || 0} AI tool(s) declared
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.toolUsageInsights.length > 0 ? (
                <div className="space-y-3">
                  {report.toolUsageInsights.map((tool, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{tool.tool}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {tool.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tool.notes}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No AI tools declared.</p>
              )}

              {/* Declaration details */}
              {report.declaration && (
                <div className="mt-4 space-y-3">
                  <Separator />
                  {report.declaration.helpDescription && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        What AI Helped With
                      </h4>
                      <p className="text-sm whitespace-pre-wrap">{report.declaration.helpDescription}</p>
                    </div>
                  )}
                  {report.declaration.manualWork && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Manual Work
                      </h4>
                      <p className="text-sm whitespace-pre-wrap">{report.declaration.manualWork}</p>
                    </div>
                  )}
                  {report.declaration.reasoning && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Tool Reasoning
                      </h4>
                      <p className="text-sm whitespace-pre-wrap">{report.declaration.reasoning}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Collaboration Insights
              </CardTitle>
              <CardDescription>
                AI partnership analysis — strengths, opportunities, and observations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.insights.length > 0 ? (
                <div className="space-y-3">
                  {report.insights.map((insight, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${
                        insight.type === "strength"
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                          : insight.type === "opportunity"
                          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                          : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {getInsightIcon(insight.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{insight.message}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {insight.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No insights generated.</p>
              )}
            </CardContent>
          </Card>

          {/* Analyzed timestamp */}
          <p className="text-xs text-muted-foreground text-center">
            Analysis generated: {new Date(report.analyzedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
