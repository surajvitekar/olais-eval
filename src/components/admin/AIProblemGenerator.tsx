"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Sparkles,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Lightbulb,
  Target,
  AlertTriangle,
  Gift,
  ClipboardList,
  Scale,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedProblem {
  id: string
  title: string
  slug: string
  category: string
  difficulty: number
  overview: string
  requirements: string[]
  constraints: string[]
  bonusFeatures: string[]
  deliverables: string[]
  evaluationCriteria: string[]
  isActive: boolean
  createdAt: string
}

const CATEGORIES = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "PYTHON", label: "Python" },
  { value: "AI_ML", label: "AI / ML" },
  { value: "API", label: "API" },
  { value: "DATABASE", label: "Database" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "UI_UX", label: "UI / UX" },
  { value: "AUTOMATION", label: "Automation" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
]

const SUGGESTED_PROMPTS = [
  "A dashboard for monitoring real-time cryptocurrency prices with alerts",
  "A URL shortening service with click analytics and QR code generation",
  "A collaborative real-time whiteboard application",
  "An AI-powered code review assistant that analyses PRs for bugs and style issues",
  "A task scheduler with dependency resolution, recurring tasks, and Slack integration",
  "A movie recommendation engine using collaborative filtering",
  "A serverless image processing pipeline with thumbnails and format conversion",
  "A CLI tool for managing and rotating cloud infrastructure secrets",
  "A polling / voting app with real-time results and fraud detection",
  "A personal finance tracker with budgeting, categorisation, and spending insights",
  "A WebSocket-based multiplayer game lobby system",
  "A system for automated deployment rollbacks with health check integration",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    2: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    3: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    4: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    5: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  }
  const labels: Record<number, string> = {
    1: "Beginner",
    2: "Easy",
    3: "Intermediate",
    4: "Hard",
    5: "Expert",
  }

  return (
    <Badge className={colors[level] || ""} variant="outline">
      {labels[level] || `Level ${level}`}
    </Badge>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find((c) => c.value === category)
  return <Badge variant="secondary">{cat?.label || category}</Badge>
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIProblemGenerator() {
  const [prompt, setPrompt] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<GeneratedProblem | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [method, setMethod] = useState<"ai" | "template" | null>(null)
  const [saved, setSaved] = useState(false)

  // ─── Generate Problem ──────────────────────────────────────────────────────

  async function handleGenerate() {
    if (prompt.trim().length < 10) {
      toast.error("Please enter a more detailed prompt (at least 10 characters)")
      return
    }

    setGenerating(true)
    setProblem(null)
    setSaved(false)
    setMethod(null)

    try {
      const body: Record<string, unknown> = { prompt: prompt.trim() }
      if (category) body.category = category
      if (difficulty) body.difficulty = parseInt(difficulty)

      const res = await fetch("/api/admin/generate-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate problem")
      }

      setProblem(data.problem)
      setMethod(data.method)

      if (data.method === "ai") {
        toast.success("Problem generated using AI")
      } else {
        toast("Problem generated from template (AI key not available)", {
          description: "Set OPENAI_API_KEY for AI-powered generation",
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate problem")
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Save / Activate Problem ──────────────────────────────────────────────

  async function handleSave() {
    if (!problem) return
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/problems/${problem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to activate problem")
      }

      setProblem((prev) => (prev ? { ...prev, isActive: true } : prev))
      setSaved(true)
      toast.success("Problem activated and ready for assignments")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate problem")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    setPrompt("")
    setCategory("")
    setDifficulty("")
    setProblem(null)
    setSaved(false)
    setMethod(null)
  }

  // ─── Select a suggested prompt ──────────────────────────────────────────────

  function selectPrompt(suggestion: string) {
    setPrompt(suggestion)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Step 1: Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Generate Problem
          </CardTitle>
          <CardDescription>
            Describe the problem you want to generate. AI will create a structured,
            production-ready assessment problem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Problem Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y font-mono"
              placeholder="Describe the problem in detail. What should the candidate build? What are the key features, users, and constraints?"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about the domain, features, and expected outcomes for
              better results.
            </p>
          </div>

          {/* Suggested Prompts */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Suggestions
            </Label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => selectPrompt(suggestion)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Lightbulb className="h-3 w-3" />
                  {suggestion.length > 40
                    ? suggestion.substring(0, 40) + "..."
                    : suggestion}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Select value={category} onValueChange={(val) => val !== null && setCategory(val)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty (optional)</Label>
              <Select value={difficulty} onValueChange={(val) => { if (val) setDifficulty(val); }}>
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Auto-select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Beginner</SelectItem>
                  <SelectItem value="2">2 — Easy</SelectItem>
                  <SelectItem value="3">3 — Intermediate</SelectItem>
                  <SelectItem value="4">4 — Hard</SelectItem>
                  <SelectItem value="5">5 — Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-4 border-t pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={generating || !prompt}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || prompt.trim().length < 10}
            className="min-w-[160px]"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Problem
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Step 2: Generated Problem Preview */}
      {problem && (
        <>
          {/* Method Badge & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Generated Problem</h2>
              <Badge
                variant={method === "ai" ? "default" : "secondary"}
                className="gap-1.5"
              >
                {method === "ai" ? (
                  <>
                    <Sparkles className="h-3 w-3" />
                    AI Generated
                  </>
                ) : (
                  <>
                    <ClipboardList className="h-3 w-3" />
                    Template
                  </>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1.5" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1.5" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </div>

          {showPreview && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-xl">{problem.title}</CardTitle>
                    <CardDescription className="text-xs">
                      slug: <code className="font-mono">{problem.slug}</code>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CategoryBadge category={problem.category} />
                    <DifficultyBadge level={problem.difficulty} />
                    {problem.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 gap-1">
                        <Check className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overview */}
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-emerald-500" />
                    Overview
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {problem.overview}
                  </p>
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Requirements */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4 text-emerald-500" />
                      Requirements
                    </h3>
                    <ul className="space-y-1.5">
                      {problem.requirements.map((req, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-emerald-500 mt-0.5 shrink-0">
                            {i + 1}.
                          </span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Constraints */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Constraints
                    </h3>
                    <ul className="space-y-1.5">
                      {problem.constraints.map((c, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bonus Features */}
                {problem.bonusFeatures.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Gift className="h-4 w-4 text-purple-500" />
                        Bonus Features
                      </h3>
                      <ul className="space-y-1.5">
                        {problem.bonusFeatures.map((b, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-purple-500 mt-0.5 shrink-0">
                              ★
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Deliverables */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4 text-blue-500" />
                      Deliverables
                    </h3>
                    <ul className="space-y-1.5">
                      {problem.deliverables.map((d, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-blue-500 mt-0.5 shrink-0">
                            {i + 1}.
                          </span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Evaluation Criteria */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-emerald-500" />
                      Evaluation Criteria
                    </h3>
                    <ul className="space-y-1.5">
                      {problem.evaluationCriteria.map((ec, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-emerald-500 mt-0.5 shrink-0">
                            {i + 1}.
                          </span>
                          <span>{ec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>

              {/* Footer Actions */}
              {!saved && (
                <CardFooter className="border-t pt-6 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    This problem is saved as a <strong>draft</strong>. Activate it
                    to make it available for assignments.
                  </p>
                  <Button
                    onClick={handleSave}
                    disabled={saving || problem.isActive}
                    className="min-w-[140px]"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Activate Problem
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}

              {saved && (
                <CardFooter className="border-t pt-6">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-emerald-500">
                      <Check className="h-4 w-4" />
                      Problem is now active and available for assignments
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      Generate Another
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
