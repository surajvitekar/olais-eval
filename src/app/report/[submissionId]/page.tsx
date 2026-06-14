"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import type { AIReport } from "@/lib/ai-collaboration/report"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tierColor(tier: string): string {
  const map: Record<string, string> = {
    beginner: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    developing: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    proficient: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    expert: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  }
  return map[tier] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
}

function tierEmoji(tier: string): string {
  const map: Record<string, string> = {
    beginner: "🌱",
    developing: "🌿",
    proficient: "🌳",
    advanced: "🚀",
    expert: "🏆",
  }
  return map[tier] ?? "❓"
}

function scoreBarColor(score: number): string {
  if (score >= 8) return "bg-emerald-500"
  if (score >= 6) return "bg-blue-500"
  if (score >= 4) return "bg-amber-500"
  return "bg-red-400"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── ScoreCard Component ─────────────────────────────────────────────────────

function ScoreCard({
  label,
  score,
  maxScore = 10,
  relevance,
}: {
  label: string
  score: number | null
  maxScore?: number
  relevance?: string
}) {
  const pct = score !== null ? Math.round((score / maxScore) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {score !== null ? `${score}/${maxScore}` : "—"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${score !== null ? scoreBarColor(score) : "bg-muted-foreground/20"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {relevance && <p className="text-xs text-muted-foreground">{relevance}</p>}
    </div>
  )
}

// ─── ToolUsageChart Component ────────────────────────────────────────────────

function ToolUsageChart({ tools, toolCount }: { tools: string[]; toolCount: number }) {
  if (toolCount === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No AI tools were declared for this submission.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {tools.map((tool, i) => {
        // Simulate usage intensity based on position (heuristic)
        const width = Math.max(30, 100 - i * 15)
        const colors = [
          "bg-emerald-500",
          "bg-blue-500",
          "bg-purple-500",
          "bg-amber-500",
          "bg-rose-500",
          "bg-cyan-500",
          "bg-indigo-500",
        ]
        return (
          <div key={tool} className="flex items-center gap-3">
            <span className="w-24 text-right text-xs font-medium shrink-0">{tool}</span>
            <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
              <div
                className={`h-full rounded-md ${colors[i % colors.length]} flex items-center px-2`}
                style={{ width: `${width}%` }}
              >
                <span className="text-[10px] text-white font-semibold">{width}%</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── CategoryBreakdown Component ─────────────────────────────────────────────

function CategoryBreakdown({ categories }: { categories: string[] }) {
  const categoryColors: Record<string, string> = {
    "Architecture & Design": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "Code Generation": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    Debugging: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    Refactoring: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    Testing: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "Styling & UI": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    Documentation: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    "Deployment & DevOps": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    "Research & Learning": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "Planning & Strategy": "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    "General Assistance": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <Badge key={cat} className={categoryColors[cat] ?? "bg-muted text-muted-foreground"}>
          {cat}
        </Badge>
      ))}
    </div>
  )
}

// ─── Contribution Donut (CSS-based) ──────────────────────────────────────────

function ContributionDonut({
  ai,
  manual,
}: {
  ai: number
  manual: number
}) {
  // Use a conic gradient to show the split
  return (
    <div className="flex items-center gap-6">
      <div
        className="h-24 w-24 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(#10b981 ${ai}%, transparent ${ai}%)`,
          boxShadow: "inset 0 0 0 8px hsl(var(--muted))",
        }}
      />
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          <span className="font-medium">AI Assistance</span>
          <span className="text-muted-foreground">{ai}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="font-medium">Manual Work</span>
          <span className="text-muted-foreground">{manual}%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Report Page ────────────────────────────────────────────────────────

export default function AITransparencyReportPage() {
  const params = useParams()
  const submissionId = params.submissionId as string

  const [report, setReport] = useState<AIReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/candidate/report/${submissionId}`)
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load report")
        }
        setReport(data.report)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [submissionId])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Generating your AI Transparency Report..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Report Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!report) return null

  const { aiScoreBreakdown, aiToolsUsed, promptAnalysis, collaborationTimeline, manualVsAI, recommendations } = report

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
          AI Transparency Report
        </p>
        <h1 className="mt-2 text-3xl font-bold">Your AI Collaboration Journey</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is not LeetCode. This is a reflection of how you collaborate with AI — a skill
          that matters in the modern engineering world.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Badge variant="outline" className="text-xs">
            {report.candidate.name ?? report.candidate.email}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {report.problem.title}
          </Badge>
        </div>
      </div>

      {/* ─── Score Overview Card ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {tierEmoji(aiScoreBreakdown.aiTier)}{" "}
            AI Collaboration Score
          </CardTitle>
          <CardDescription>
            Overall AI Usage score and collaboration tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
            {/* Score circle */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold"
                style={{
                  background:
                    aiScoreBreakdown.aiUsageScore !== null
                      ? `conic-gradient(#10b981 ${(aiScoreBreakdown.aiUsageScore / 10) * 100}%, hsl(var(--muted)) ${(aiScoreBreakdown.aiUsageScore / 10) * 100}%)`
                      : "hsl(var(--muted))",
                }}
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-background text-2xl">
                  {aiScoreBreakdown.aiUsageScore !== null
                    ? aiScoreBreakdown.aiUsageScore
                    : "—"}
                </span>
              </div>
              <Badge className={`mt-2 ${tierColor(aiScoreBreakdown.aiTier)}`}>
                {aiScoreBreakdown.aiTier.charAt(0).toUpperCase() + aiScoreBreakdown.aiTier.slice(1)}
              </Badge>
            </div>

            {/* Context scores */}
            <div className="flex-1 space-y-3 self-stretch">
              {aiScoreBreakdown.contextScores.length > 0 ? (
                aiScoreBreakdown.contextScores.map((s) => (
                  <ScoreCard
                    key={s.label}
                    label={s.label}
                    score={s.score}
                    relevance={s.relevance}
                  />
                ))
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No evaluation scores available yet.
                </p>
              )}
              <ScoreCard
                label="Overall"
                score={aiScoreBreakdown.totalScore !== null ? Math.round(aiScoreBreakdown.totalScore / 10) : null}
                maxScore={10}
                relevance="Composite performance score"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 1: AI Tools Used ────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-emerald-500">01</span>
            AI Tools Used
          </CardTitle>
          <CardDescription>
            {aiToolsUsed.toolCount === 0
              ? "No AI tools declared"
              : `${aiToolsUsed.toolCount} tool${aiToolsUsed.toolCount > 1 ? "s" : ""} used — ${aiToolsUsed.toolDiversity === "multi" ? "multi-tool approach" : "single-tool approach"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToolUsageChart tools={aiToolsUsed.tools} toolCount={aiToolsUsed.toolCount} />

          {aiToolsUsed.reasoning && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reasoning for Tool Choices
              </p>
              <p className="rounded-md bg-muted/50 p-3 text-sm">{aiToolsUsed.reasoning}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 2: Prompt Analysis ──────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-emerald-500">02</span>
            Prompt Analysis Summary
          </CardTitle>
          <CardDescription>
            {promptAnalysis.promptCategories.length > 0
              ? `${promptAnalysis.promptCategories.length} prompt categories detected`
              : "No prompt data provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt categories */}
          {promptAnalysis.promptCategories.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </p>
              <CategoryBreakdown categories={promptAnalysis.promptCategories} />
            </div>
          )}

          {/* Prompt quality */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prompt Quality Estimate
            </p>
            <ScoreCard
              label="Prompt Quality"
              score={promptAnalysis.estimatedPromptQuality}
              relevance={
                promptAnalysis.estimatedPromptQuality >= 7
                  ? "Detailed, contextual prompts — great for AI collaboration"
                  : promptAnalysis.estimatedPromptQuality >= 4
                    ? "Moderate detail — try adding more context and constraints"
                    : "Brief prompts — adding more detail will improve AI collaboration"
              }
            />
          </div>

          {/* Best practice badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Best Practice
            </span>
            {promptAnalysis.hasPromptsDirectory ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                prompts/ folder referenced
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                No prompts/ folder mentioned
              </Badge>
            )}
          </div>

          {/* Raw prompts */}
          {promptAnalysis.rawPrompts && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Show raw prompt text
              </summary>
              <pre className="mt-2 max-h-48 overflow-y-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                {promptAnalysis.rawPrompts}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 3: Collaboration Timeline ───────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-emerald-500">03</span>
            Collaboration Timeline
          </CardTitle>
          <CardDescription>Key milestones in this evaluation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-0.5 bg-border" />

            {[
              {
                label: "Problem Assigned",
                date: "—",
                description: "Problem was assigned to the candidate",
                icon: "📋",
              },
              {
                label: "Solution Submitted",
                date: collaborationTimeline.submittedAt,
                description: `Submitted in ${collaborationTimeline.durationLabel}`,
                icon: "📤",
              },
              {
                label: "Evaluated",
                date: collaborationTimeline.evaluatedAt ?? "Pending",
                description: collaborationTimeline.evaluatedAt
                  ? "Evaluation completed by reviewer"
                  : "Evaluation not yet completed",
                icon: collaborationTimeline.evaluatedAt ? "✅" : "⏳",
              },
              {
                label: "Report Generated",
                date: report.generatedAt,
                description: "AI Transparency Report created",
                icon: "📊",
              },
            ].map((item) => (
              <div key={item.label} className="relative flex gap-4 pb-6 last:pb-0">
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-sm">
                  {item.icon}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.date !== "—" ? formatDate(item.date) : "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 4: Manual vs AI Work ────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-emerald-500">04</span>
            Manual vs AI Work
          </CardTitle>
          <CardDescription>How you distributed work between yourself and AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContributionDonut
            ai={manualVsAI.aiContributionEstimate}
            manual={manualVsAI.manualContributionEstimate}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {manualVsAI.aiHelpDescription && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  AI Helped With
                </p>
                <p className="text-sm">{manualVsAI.aiHelpDescription}</p>
              </div>
            )}
            {manualVsAI.manualWork && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  You Did Manually
                </p>
                <p className="text-sm">{manualVsAI.manualWork}</p>
              </div>
            )}
          </div>

          {manualVsAI.architectureNotes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Architecture Decisions (Manual)
              </p>
              <p className="rounded-md bg-muted/50 p-3 text-sm">{manualVsAI.architectureNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 5: AI Collaboration Score Breakdown ──────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-emerald-500">05</span>
            AI Collaboration Score Breakdown
          </CardTitle>
          <CardDescription>
            {aiScoreBreakdown.performanceLabel !== "Not evaluated"
              ? `Overall: ${aiScoreBreakdown.performanceLabel}`
              : "Awaiting evaluation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {aiScoreBreakdown.contextScores.map((s) => (
              <ScoreCard key={s.label} label={s.label} score={s.score} relevance={s.relevance} />
            ))}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">AI Usage Score</p>
              <p className="text-2xl font-bold">
                {aiScoreBreakdown.aiUsageScore !== null ? aiScoreBreakdown.aiUsageScore : "—"}
                <span className="text-sm font-normal text-muted-foreground">/10</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Overall Score</p>
              <p className="text-2xl font-bold">
                {aiScoreBreakdown.totalScore !== null ? aiScoreBreakdown.totalScore : "—"}
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Tier</p>
              <Badge className={tierColor(aiScoreBreakdown.aiTier)}>
                {aiScoreBreakdown.aiTier.charAt(0).toUpperCase() + aiScoreBreakdown.aiTier.slice(1)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 6: Recommendations ──────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-emerald-500">06</span>
            Growth Recommendations
          </CardTitle>
          <CardDescription>
            Personalized guidance based on your AI collaboration patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strengths */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <span>💪</span> Strengths
            </p>
            <ul className="space-y-1.5">
              {recommendations.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-emerald-500">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Growth Areas */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <span>🌱</span> Areas for Growth
            </p>
            <ul className="space-y-1.5">
              {recommendations.growthAreas.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-amber-500">→</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Next Steps */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400">
              <span>🎯</span> Next Steps
            </p>
            <ul className="space-y-1.5">
              {recommendations.nextSteps.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-blue-500">{i + 1}.</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Resources */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400">
              <span>📚</span> Recommended Resources
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {recommendations.resources.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3"
                >
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>
          AI Transparency Report &middot; Generated {formatDate(report.generatedAt)}
        </p>
        <p className="mt-1">
          This report reflects how you collaborated with AI on this particular challenge.
          AI collaboration is a skill — practice, iterate, and grow.
        </p>
      </div>
    </main>
  )
}
