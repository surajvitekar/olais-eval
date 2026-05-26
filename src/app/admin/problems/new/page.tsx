"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"

const CATEGORIES = [
  "full-stack",
  "automation",
  "ai-workflows",
  "apis",
  "dashboards",
  "data",
  "tooling",
  "agentic",
  "ocr",
  "monitoring",
  "ai-utilities",
]

export default function NewProblemPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("3")
  const [variantGroup, setVariantGroup] = useState("")
  const [overview, setOverview] = useState("")
  const [requirementsText, setRequirementsText] = useState("")
  const [constraintsText, setConstraintsText] = useState("")
  const [bonusFeaturesText, setBonusFeaturesText] = useState("")
  const [deliverablesText, setDeliverablesText] = useState("")
  const [evaluationCriteriaText, setEvaluationCriteriaText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (status === "loading") return null
  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    router.push("/login")
    return null
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value))
    }
  }

  function parseLines(text: string): string[] {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const requirements = parseLines(requirementsText)
    const constraints = parseLines(constraintsText)
    const bonusFeatures = parseLines(bonusFeaturesText)
    const deliverables = parseLines(deliverablesText)
    const evaluationCriteria = parseLines(evaluationCriteriaText)

    if (requirements.length < 3) {
      toast.error("Add at least 3 requirements (one per line)")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/admin/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          category,
          difficulty: parseInt(difficulty),
          overview,
          requirements,
          constraints,
          bonusFeatures,
          deliverables,
          evaluationCriteria,
          variantGroup: variantGroup || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details ? JSON.stringify(data.details) : "Failed to create problem")
      }

      toast.success("Problem created successfully")
      router.push("/admin/problems")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create problem")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Problem</h1>
        <p className="mt-1 text-muted-foreground">
          Add a new evaluation problem to the bank
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Problem Details</CardTitle>
            <CardDescription>
              Define the problem statement for candidates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title & Slug */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., Real-Time Collaboration Board"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g., real-time-collab-board"
                  required
                />
              </div>
            </div>

            {/* Category & Difficulty & Variant Group */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => { if (v !== null) setCategory(v); }} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty (1-5)</Label>
                <Select value={difficulty} onValueChange={(v) => { if (v !== null) setDifficulty(v); }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} — {["Easy", "Moderate", "Medium", "Hard", "Expert"][n - 1]}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="variantGroup">Variant Group</Label>
                <Input
                  id="variantGroup"
                  value={variantGroup}
                  onChange={(e) => setVariantGroup(e.target.value)}
                  placeholder="e.g., full-stack-real-time"
                />
              </div>
            </div>

            {/* Overview */}
            <div className="space-y-2">
              <Label htmlFor="overview">Overview (2-3 paragraphs)</Label>
              <textarea
                id="overview"
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Describe the problem in detail..."
                required
              />
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <Label htmlFor="requirements">
                Requirements (one per line, min 3)
              </Label>
              <textarea
                id="requirements"
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="User authentication with session management&#10;Real-time collaboration using WebSockets&#10;Drawing canvas with pen and shapes..."
                required
              />
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <Label htmlFor="constraints">
                Constraints (one per line)
              </Label>
              <textarea
                id="constraints"
                value={constraintsText}
                onChange={(e) => setConstraintsText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Must handle at least 10 concurrent users&#10;Max latency under 500ms..."
              />
            </div>

            {/* Bonus Features */}
            <div className="space-y-2">
              <Label htmlFor="bonusFeatures">
                Bonus Features (one per line, optional)
              </Label>
              <textarea
                id="bonusFeatures"
                value={bonusFeaturesText}
                onChange={(e) => setBonusFeaturesText(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Dark mode toggle&#10;Export as PDF..."
              />
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              <Label htmlFor="deliverables">
                Deliverables (one per line)
              </Label>
              <textarea
                id="deliverables"
                value={deliverablesText}
                onChange={(e) => setDeliverablesText(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Git repository with full source code&#10;Live deployment URL&#10;ARCHITECTURE.md..."
                required
              />
            </div>

            {/* Evaluation Criteria */}
            <div className="space-y-2">
              <Label htmlFor="evaluationCriteria">
                Evaluation Criteria (one per line, min 3)
              </Label>
              <textarea
                id="evaluationCriteria"
                value={evaluationCriteriaText}
                onChange={(e) => setEvaluationCriteriaText(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Real-time sync quality and latency&#10;UI/UX polish and responsiveness&#10;Code organization and architecture..."
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/admin/problems")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Problem"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
