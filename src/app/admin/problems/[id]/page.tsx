"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
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
import LoadingSpinner from "@/components/shared/LoadingSpinner"

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

interface ProblemData {
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
  variantGroup: string | null
}

export default function EditProblemPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
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
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchProblem()
    }
  }, [status, session, id])

  async function fetchProblem() {
    try {
      const res = await fetch(`/api/admin/problems/${id}`)
      if (!res.ok) throw new Error("Failed to fetch problem")
      const data = await res.json()
      const p: ProblemData = data.problem

      setTitle(p.title)
      setSlug(p.slug)
      setCategory(p.category)
      setDifficulty(String(p.difficulty))
      setVariantGroup(p.variantGroup ?? "")
      setOverview(p.overview)
      setRequirementsText(p.requirements.join("\n"))
      setConstraintsText(p.constraints.join("\n"))
      setBonusFeaturesText(p.bonusFeatures.join("\n"))
      setDeliverablesText(p.deliverables.join("\n"))
      setEvaluationCriteriaText(p.evaluationCriteria.join("\n"))
      setIsActive(p.isActive)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load problem")
      toast.error("Failed to load problem")
    } finally {
      setLoading(false)
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
      const res = await fetch(`/api/admin/problems/${id}`, {
        method: "PUT",
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
          isActive,
          variantGroup: variantGroup || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update problem")
      }

      toast.success("Problem updated successfully")
      router.push("/admin/problems")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update problem")
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{fetchError}</p>
            <Button className="mt-4" onClick={() => router.push("/admin/problems")}>
              Back to Problems
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Problem</h1>
        <p className="mt-1 text-muted-foreground">
          Update problem details
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Problem Details</CardTitle>
            <CardDescription>
              Modify the problem statement
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
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Category & Difficulty & Variant Group */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }} required>
                  <SelectTrigger id="category">
                    <SelectValue />
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
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive">Active (visible to candidates)</Label>
            </div>

            {/* Overview */}
            <div className="space-y-2">
              <Label htmlFor="overview">Overview</Label>
              <textarea
                id="overview"
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                required
              />
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <Label htmlFor="constraints">Constraints (one per line)</Label>
              <textarea
                id="constraints"
                value={constraintsText}
                onChange={(e) => setConstraintsText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Bonus Features */}
            <div className="space-y-2">
              <Label htmlFor="bonusFeatures">Bonus Features (one per line, optional)</Label>
              <textarea
                id="bonusFeatures"
                value={bonusFeaturesText}
                onChange={(e) => setBonusFeaturesText(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              <Label htmlFor="deliverables">Deliverables (one per line)</Label>
              <textarea
                id="deliverables"
                value={deliverablesText}
                onChange={(e) => setDeliverablesText(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
