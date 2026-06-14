"use client"

import { useState, useEffect } from "react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  AlertCircle,
  ArrowUp,
  ArrowDown,
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
  createdAt: string
  updatedAt?: string
}

interface DimensionForm {
  name: string
  description: string
  minScore: number
  maxScore: number
  weight: number
  rubric: RubricLevel[]
  displayOrder: number
  isActive: boolean
}

const emptyForm: DimensionForm = {
  name: "",
  description: "",
  minScore: 0,
  maxScore: 100,
  weight: 1.0,
  rubric: [],
  displayOrder: 0,
  isActive: true,
}

const DEFAULT_DIMENSIONS = [
  { name: "Problem Solving", description: "Ability to analyze and solve complex problems", weight: 1.0, displayOrder: 0 },
  { name: "Technical Skills", description: "Depth of technical knowledge and hands-on ability", weight: 1.0, displayOrder: 1 },
  { name: "Communication", description: "Clarity of expression and ability to explain ideas", weight: 1.0, displayOrder: 2 },
  { name: "Cultural Fit", description: "Alignment with team values and work style", weight: 1.0, displayOrder: 3 },
]

// ── Main Component ──────────────────────────────────────────────────────────

export default function ScoringDimensionsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [dimensions, setDimensions] = useState<ScoringDimension[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DimensionForm>(emptyForm)
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Auth ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
      return
    }
    if (authStatus === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    if (authStatus === "authenticated") {
      fetchDimensions()
    }
  }, [authStatus, session, router])

  // ── Fetch ──────────────────────────────────────────────────────────────

  async function fetchDimensions() {
    try {
      const res = await fetch("/api/admin/scoring-dimensions")
      if (res.ok) {
        const data = await res.json()
        setDimensions(data.dimensions || [])
      }
    } catch (err) {
      console.error("Failed to fetch dimensions", err)
      toast.error("Failed to load scoring dimensions")
    } finally {
      setLoading(false)
    }
  }

  // ── Create default dimensions ──────────────────────────────────────────

  async function createDefaults() {
    setSubmitting(true)
    try {
      for (let i = 0; i < DEFAULT_DIMENSIONS.length; i++) {
        const d = DEFAULT_DIMENSIONS[i]
        await fetch("/api/admin/scoring-dimensions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...d, displayOrder: i }),
        })
      }
      toast.success("Default dimensions created")
      fetchDimensions()
    } catch {
      toast.error("Failed to create default dimensions")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Open dialog for create/edit ────────────────────────────────────────

  function openCreate() {
    setEditingId(null)
    setForm({
      ...emptyForm,
      displayOrder: dimensions.length,
    })
    setFormError("")
    setDialogOpen(true)
  }

  function openEdit(dim: ScoringDimension) {
    setEditingId(dim.id)
    setForm({
      name: dim.name,
      description: dim.description || "",
      minScore: dim.minScore,
      maxScore: dim.maxScore,
      weight: dim.weight,
      rubric: dim.rubric || [],
      displayOrder: dim.displayOrder,
      isActive: dim.isActive,
    })
    setFormError("")
    setDialogOpen(true)
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!form.name.trim()) {
      setFormError("Name is required")
      return
    }

    setSubmitting(true)
    try {
      const url = editingId
        ? `/api/admin/scoring-dimensions/${editingId}`
        : "/api/admin/scoring-dimensions"

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rubric: form.rubric.length > 0 ? form.rubric : undefined,
        }),
      })

      if (res.ok) {
        setDialogOpen(false)
        toast.success(editingId ? "Dimension updated" : "Dimension created")
        fetchDimensions()
      } else {
        const data = await res.json()
        setFormError(data.error || "Failed to save")
      }
    } catch {
      setFormError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/scoring-dimensions/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Dimension deleted")
        fetchDimensions()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete")
      }
    } catch {
      toast.error("Network error")
    }
    setDeleteConfirm(null)
  }

  // ── Move order ─────────────────────────────────────────────────────────

  async function moveDimension(id: string, direction: "up" | "down") {
    const idx = dimensions.findIndex((d) => d.id === id)
    if (idx === -1) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= dimensions.length) return

    const current = dimensions[idx]
    const swap = dimensions[swapIdx]

    // Update both
    await Promise.all([
      fetch(`/api/admin/scoring-dimensions/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: swap.displayOrder }),
      }),
      fetch(`/api/admin/scoring-dimensions/${swap.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: current.displayOrder }),
      }),
    ])

    fetchDimensions()
  }

  // ── Rubric helpers ─────────────────────────────────────────────────────

  function addRubricLevel() {
    setForm((prev) => ({
      ...prev,
      rubric: [
        ...prev.rubric,
        {
          level: prev.rubric.length,
          label: "",
          description: "",
        },
      ],
    }))
  }

  function updateRubricLevel(index: number, field: keyof RubricLevel, value: string) {
    setForm((prev) => {
      const rubric = [...prev.rubric]
      rubric[index] = { ...rubric[index], [field]: value }
      return { ...prev, rubric }
    })
  }

  function removeRubricLevel(index: number) {
    setForm((prev) => ({
      ...prev,
      rubric: prev.rubric.filter((_, i) => i !== index),
    }))
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <LoadingSpinner text="Loading scoring dimensions..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scoring Dimensions</h1>
          <p className="mt-1 text-muted-foreground">
            Configure the dimensions evaluators use to score interviews
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Dimension
        </Button>
      </div>

      {dimensions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No scoring dimensions configured</CardTitle>
            <CardDescription>
              Create custom scoring dimensions or load the default set (Problem Solving,
              Technical Skills, Communication, Cultural Fit).
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={createDefaults} disabled={submitting} variant="outline">
              Load Default Dimensions
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-3">
          {dimensions.map((dim, idx) => (
            <Card key={dim.id} className={dim.isActive ? "" : "opacity-60"}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveDimension(dim.id, "up")}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveDimension(dim.id, "down")}
                      disabled={idx === dimensions.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{dim.name}</span>
                      {!dim.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {dim.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {dim.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Weight: {dim.weight}</span>
                      <span>Range: {dim.minScore}-{dim.maxScore}</span>
                      {dim.rubric && dim.rubric.length > 0 && (
                        <span>{dim.rubric.length} rubric levels</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(dim)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteConfirm(dim.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Scoring Dimension" : "Add Scoring Dimension"}
            </DialogTitle>
            <DialogDescription>
              Define a dimension that evaluators use to score candidates.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Problem Solving"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What does this dimension measure?"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minScore">Min Score</Label>
                <Input
                  id="minScore"
                  type="number"
                  min={0}
                  max={100}
                  value={form.minScore}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, minScore: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxScore">Max Score</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min={0}
                  max={100}
                  value={form.maxScore}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, maxScore: parseInt(e.target.value) || 100 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={form.weight}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weight: parseFloat(e.target.value) || 1.0 }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            {/* Rubric Levels */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rubric Levels (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRubricLevel}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Level
                </Button>
              </div>
              {form.rubric.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Rubric levels help evaluators understand what each score means. Add
                  levels like Beginner, Intermediate, Advanced.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.rubric.map((level, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                      <Badge className="mt-1.5 shrink-0">{i + 1}</Badge>
                      <div className="flex-1 space-y-1.5">
                        <Input
                          placeholder="Label (e.g., Beginner)"
                          value={level.label}
                          onChange={(e) => updateRubricLevel(i, "label", e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Description (e.g., Basic understanding of concepts)"
                          value={level.description}
                          onChange={(e) =>
                            updateRubricLevel(i, "description", e.target.value)
                          }
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 mt-1"
                        onClick={() => removeRubricLevel(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Scoring Dimension?</DialogTitle>
            <DialogDescription>
              This will permanently remove this dimension and any associated scores.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
