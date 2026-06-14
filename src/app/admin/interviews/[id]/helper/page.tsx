"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import {
  User,
  Calendar,
  Clock,
  Globe,
  Video,
  Star,
  Save,
  CheckCircle2,
  Lightbulb,
  FileText,
  ExternalLink,
} from "lucide-react"

// ── Types ───────────────────────────────────────────────────────────────────

interface RubricLevel {
  level: number
  label: string
  description: string
}

interface ScoringDimension {
  id: string
  name: string
  description: string | null
  minScore: number
  maxScore: number
  weight: number
  rubric: RubricLevel[] | null
  displayOrder: number
  isActive: boolean
}

interface HelperData {
  interview: {
    id: string
    status: string
    scheduledAt: string
    duration: number
    timezone: string
    meetingLink: string | null
    notes: string | null
    evaluatorNotes: string | null
    overallScore: number | null
    scoredAt: string | null
  }
  candidate: {
    id: string
    name: string | null
    email: string
    phone: string | null
    college: string | null
    status: string
    resumeUrl: string | null
    githubUrl: string | null
    linkedinUrl: string | null
    skillProfiles: Array<{
      scores: Record<string, number>
      topSkills: string[]
    }>
    evaluations: Array<{
      totalScore: number | null
    }>
  }
  dimensions: ScoringDimension[]
  myScores: Record<string, number>
  draft: {
    scores: Record<string, number>
    notes: string
    savedAt: string
  } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: "bg-gray-100 text-gray-800",
  ASSESSMENT_COMPLETED: "bg-blue-100 text-blue-800",
  PROBLEM_ASSIGNED: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  UNDER_REVIEW: "bg-cyan-100 text-cyan-800",
  SHORTLISTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  SELECTED: "bg-green-100 text-green-800",
}

function formatDateTime(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: tz,
      dateStyle: "full",
      timeStyle: "short",
    })
  } catch {
    return new Date(iso).toLocaleString()
  }
}

function getRubricHint(
  score: number,
  dimension: ScoringDimension
): string | null {
  if (!dimension.rubric || dimension.rubric.length === 0) return null

  const range = dimension.maxScore - dimension.minScore
  const normalizedScore = range > 0 ? (score - dimension.minScore) / range : 0
  const levelIndex = Math.min(
    Math.floor(normalizedScore * dimension.rubric.length),
    dimension.rubric.length - 1
  )
  const level = dimension.rubric[levelIndex]
  return level ? `${level.label}: ${level.description}` : null
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function InterviewHelperPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const interviewId = params.id as string

  const [data, setData] = useState<HelperData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Scoring state
  const [scores, setScores] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Auto-save
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle")

  // ── Auth ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
      return
    }
    if (authStatus === "authenticated") {
      fetchHelperData()
    }
  }, [authStatus, router, interviewId])

  // ── Fetch helper data ──────────────────────────────────────────────────

  async function fetchHelperData() {
    try {
      const res = await fetch(`/api/admin/interviews/${interviewId}/helper`)
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard")
          return
        }
        throw new Error("Failed to load interview data")
      }
      const helperData: HelperData = await res.json()
      setData(helperData)

      // Restore draft or existing scores
      if (helperData.draft) {
        const restored: Record<string, string> = {}
        for (const [key, val] of Object.entries(helperData.draft.scores)) {
          restored[key] = String(val)
        }
        // Merge with actual submitted scores (submitted ones take precedence)
        for (const [key, val] of Object.entries(helperData.myScores)) {
          restored[key] = String(val)
        }
        setScores(restored)
        setNotes(helperData.draft.notes)

        // If they already have scores for all dimensions, mark submitted
        if (
          helperData.dimensions.length > 0 &&
          Object.keys(helperData.myScores).length >= helperData.dimensions.length
        ) {
          setSubmitted(true)
        }
      } else if (Object.keys(helperData.myScores).length > 0) {
        const restored: Record<string, string> = {}
        for (const [key, val] of Object.entries(helperData.myScores)) {
          restored[key] = String(val)
        }
        setScores(restored)
        if (Object.keys(restored).length >= helperData.dimensions.length) {
          setSubmitted(true)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  // ── Auto-save draft ────────────────────────────────────────────────────

  const saveDraft = useCallback(async () => {
    if (!data || submitted) return

    setSaveStatus("saving")
    try {
      const numericScores: Record<string, number> = {}
      for (const [key, val] of Object.entries(scores)) {
        const n = parseInt(val)
        if (!isNaN(n)) numericScores[key] = n
      }

      const res = await fetch(`/api/admin/interviews/${interviewId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: numericScores,
          notes,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setLastSaved(result.savedAt)
        setSaveStatus("saved")
      }
    } catch {
      setSaveStatus("idle")
    }
  }, [data, scores, notes, interviewId, submitted])

  // Auto-save on score/notes change with 2s debounce
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    if (submitted) return

    setSaveStatus("idle")
    autoSaveTimer.current = setTimeout(() => {
      saveDraft()
    }, 2000)

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [scores, notes, saveDraft, submitted])

  // ── Submit scores ──────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!data) return

    // Validate all dimensions have scores
    const missing = data.dimensions.filter(
      (d) => !scores[d.id] || scores[d.id].trim() === ""
    )
    if (missing.length > 0) {
      toast.error(
        `Please score all dimensions: ${missing.map((d) => d.name).join(", ")}`
      )
      return
    }

    // Save draft first
    await saveDraft()

    setSubmitting(true)
    try {
      const dimensionScores = data.dimensions.map((d) => ({
        dimensionId: d.id,
        score: parseInt(scores[d.id]),
      }))

      const res = await fetch(`/api/admin/interviews/${interviewId}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dimensionScores,
          evaluatorNotes: notes || undefined,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
        toast.success("Scores submitted successfully")
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Failed to submit scores")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Score change handler ───────────────────────────────────────────────

  function handleScoreChange(dimensionId: string, value: string) {
    // Only allow numbers
    if (value !== "" && !/^\d+$/.test(value)) return
    setScores((prev) => ({ ...prev, [dimensionId]: value }))
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <LoadingSpinner text="Loading interview helper..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error || "Interview not found"}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/admin/interviews/my")}
            >
              Back to My Interviews
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { interview, candidate, dimensions } = data
  const canEdit = !submitted && interview.status !== "CANCELLED"

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Interview Helper
            </h1>
            <p className="text-muted-foreground">
              Score and review candidate performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={candidate.status in STATUS_COLORS ? STATUS_COLORS[candidate.status] : "bg-gray-100"}>
              {candidate.status}
            </Badge>
            {submitted && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Scores Submitted
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Candidate Profile */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Candidate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">{candidate.name || "Unnamed Candidate"}</p>
                <p className="text-muted-foreground">{candidate.email}</p>
              </div>
              {candidate.phone && (
                <p className="text-xs text-muted-foreground">📞 {candidate.phone}</p>
              )}
              {candidate.college && (
                <p className="text-xs text-muted-foreground">🎓 {candidate.college}</p>
              )}
              <div className="flex flex-wrap gap-1 pt-1">
                {candidate.resumeUrl && (
                  <a
                    href={candidate.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" /> Resume <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {candidate.githubUrl && (
                  <a
                    href={candidate.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    GitHub <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Skill Profile */}
          {candidate.skillProfiles.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Skill Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {candidate.skillProfiles[0].scores && (
                  <div className="space-y-1.5">
                    {Object.entries(
                      candidate.skillProfiles[0].scores as Record<string, number>
                    )
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([skill, score]) => (
                        <div key={skill} className="flex items-center gap-2">
                          <span className="text-xs w-24 truncate shrink-0">{skill}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-6 text-right">
                            {Math.round(score)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                {candidate.skillProfiles[0].topSkills &&
                  Array.isArray(candidate.skillProfiles[0].topSkills) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(candidate.skillProfiles[0].topSkills as string[]).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Evaluation Score */}
          {candidate.evaluations.length > 0 &&
            candidate.evaluations[0].totalScore !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Evaluation Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(candidate.evaluations[0].totalScore!)}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Interview Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Interview Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDateTime(interview.scheduledAt, interview.timezone)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {interview.duration} minutes
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                {interview.timezone}
              </div>
              {interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Video className="h-3.5 w-3.5" />
                  Join Meeting
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Scoring Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Suggested Questions */}
          {candidate.skillProfiles.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Suggested Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {/* Find gaps: low scores in skill profile */}
                  {candidate.skillProfiles[0].scores &&
                    Object.entries(
                      candidate.skillProfiles[0].scores as Record<string, number>
                    )
                      .sort(([, a], [, b]) => a - b)
                      .slice(0, 3)
                      .map(([skill, score]) => (
                        <li key={skill} className="flex items-center gap-2">
                          <span className="text-destructive">●</span>
                          <span>
                            <strong>{skill}</strong> ({Math.round(score)}/100) —
                            consider probing deeper here
                          </span>
                        </li>
                      ))}
                  {candidate.evaluations.length > 0 &&
                    candidate.evaluations[0].totalScore !== null && (
                      <li className="flex items-center gap-2 pt-1">
                        <span className="text-amber-500">●</span>
                        <span>
                          Evaluation score:{" "}
                          <strong>
                            {Math.round(candidate.evaluations[0].totalScore)}/100
                          </strong>{" "}
                          — validate during interview
                        </span>
                      </li>
                    )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Scoring Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Scoring
              </CardTitle>
              <CardDescription>
                Rate the candidate across each dimension
                {lastSaved && (
                  <span className="ml-2 text-xs">
                    {saveStatus === "saving" && "💾 Saving..."}
                    {saveStatus === "saved" && "✅ Auto-saved"}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {dimensions.map((dim) => {
                  const scoreVal = scores[dim.id]
                  const numScore = scoreVal ? parseInt(scoreVal) : null
                  const hint =
                    numScore !== null ? getRubricHint(numScore, dim) : null
                  const rubricHint =
                    !hint && dim.rubric && dim.rubric.length > 0
                      ? `Rubric: ${dim.rubric.map((r) => `${r.label}`).join(" → ")}`
                      : null

                  return (
                    <div key={dim.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">{dim.name}</Label>
                            <span className="text-xs text-muted-foreground">
                              (weight: {dim.weight})
                            </span>
                          </div>
                          {dim.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {dim.description}
                            </p>
                          )}
                        </div>
                        <div className="w-24 shrink-0 ml-3">
                          <Input
                            type="number"
                            min={dim.minScore}
                            max={dim.maxScore}
                            placeholder={`${dim.minScore}-${dim.maxScore}`}
                            value={scoreVal ?? ""}
                            onChange={(e) =>
                              handleScoreChange(dim.id, e.target.value)
                            }
                            disabled={!canEdit}
                            className="text-center"
                          />
                        </div>
                      </div>
                      {hint && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {hint}
                        </p>
                      )}
                      {rubricHint && !hint && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {rubricHint}
                        </p>
                      )}
                    </div>
                  )
                })}

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="helperNotes">Interview Notes</Label>
                  <textarea
                    id="helperNotes"
                    className="h-28 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
                    placeholder="Record your observations, key points, and overall impression..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    Notes auto-save every 2 seconds
                  </p>
                </div>

                {/* Interview notes from admin */}
                {interview.notes && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Admin Notes
                    </p>
                    <p className="text-sm">{interview.notes}</p>
                  </div>
                )}

                {!canEdit && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                    {submitted
                      ? "Scores have been submitted. Contact an admin if you need to rescore."
                      : "This interview has been cancelled."}
                  </div>
                )}

                {canEdit && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Save className="h-3 w-3" />
                      {saveStatus === "saving"
                        ? "Saving..."
                        : saveStatus === "saved"
                          ? `Auto-saved ${new Date(lastSaved!).toLocaleTimeString()}`
                          : "Unsaved changes"}
                    </div>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Scores"}
                    </Button>
                  </div>
                )}

                {/* Submitted scores visualization + recommendations */}
                {submitted && dimensions.length > 0 && (
                  <div className="space-y-4">
                    {/* Score Visualization */}
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Score Breakdown
                      </h4>
                      <div className="space-y-3">
                        {dimensions.map((dim) => {
                          const score = data.myScores[dim.id]
                          const pct = score !== undefined && dim.maxScore > 0
                            ? Math.round((score / dim.maxScore) * 100)
                            : 0
                          const barColor =
                            pct >= 80
                              ? "bg-green-500"
                              : pct >= 60
                                ? "bg-amber-500"
                                : "bg-red-500"
                          return (
                            <div key={dim.id}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <div className="flex items-center gap-2">
                                  <span>{dim.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    (w: {dim.weight})
                                  </span>
                                </div>
                                <span className="font-medium">
                                  {score ?? "-"}/{dim.maxScore}
                                </span>
                              </div>
                              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${barColor}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Overall */}
                      {interview.overallScore !== null && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Weighted Overall</span>
                            <span className="text-lg font-bold">
                              {interview.overallScore}
                              <span className="text-xs font-normal text-muted-foreground">/100</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Next-Step Recommendations */}
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Recommendations
                      </h4>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          const avgScore = dimensions.reduce((sum, dim) => {
                            const s = data.myScores[dim.id]
                            return sum + (s ?? 0)
                          }, 0) / dimensions.length
                          const evalScore = candidate.evaluations[0]?.totalScore

                          if (avgScore >= 75) {
                            return (
                              <>
                                <p className="text-green-700 dark:text-green-400 font-medium">
                                  ✅ Strong candidate — consider shortlisting
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Scored above 75% average across all dimensions.
                                  {evalScore !== null && evalScore !== undefined && evalScore >= 70
                                    ? " Evaluation score also strong. Ready for shortlist."
                                    : " Review alongside evaluation score before making a final decision."}
                                </p>
                              </>
                            )
                          } else if (avgScore >= 50) {
                            return (
                              <>
                                <p className="text-amber-700 dark:text-amber-400 font-medium">
                                  ⚠️ Moderate performer — may need follow-up
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Average score between 50-75%. Consider a follow-up interview
                                  focused on weaker dimensions.
                                  {evalScore !== null && evalScore !== undefined
                                    ? ` Evaluation score: ${Math.round(evalScore)}/100.`
                                    : ""}
                                </p>
                              </>
                            )
                          } else {
                            return (
                              <>
                                <p className="text-red-700 dark:text-red-400 font-medium">
                                  ❌ Below average — consider rejection
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Average score below 50%. Unlikely to progress without significant
                                  improvement in assessed areas.
                                </p>
                              </>
                            )
                          }
                        })()}

                        {/* Low-scoring dimensions */}
                        <div className="pt-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Areas to probe if considering follow-up:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {dimensions
                              .filter((dim) => {
                                const s = data.myScores[dim.id]
                                return s !== undefined && dim.maxScore > 0 &&
                                  (s / dim.maxScore) < 0.6
                              })
                              .map((dim) => (
                                <Badge key={dim.id} variant="outline" className="text-xs">
                                  {dim.name}
                                </Badge>
                              ))}
                            {dimensions.every((dim) => {
                              const s = data.myScores[dim.id]
                              return s === undefined || dim.maxScore <= 0 || (s / dim.maxScore) >= 0.6
                            }) && (
                              <span className="text-xs text-muted-foreground">
                                No significant gaps identified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
