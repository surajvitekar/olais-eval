"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const DIMENSIONS = [
  { key: "executionScore", label: "Execution", description: "Code runs, meets requirements, handles edge cases" },
  { key: "architectureScore", label: "Architecture", description: "Project structure, component design, data flow" },
  { key: "thoughtProcessScore", label: "Thought Process", description: "Problem-solving approach, planning, trade-offs" },
  { key: "aiUsageScore", label: "AI Usage", description: "Effective use of AI tools, prompt quality, iteration" },
  { key: "deploymentScore", label: "Deployment", description: "Live deployment, CI/CD, environment config" },
  { key: "codeOrganizationScore", label: "Code Org", description: "Clean code, naming, file organization, conventions" },
  { key: "uiUxScore", label: "UI/UX", description: "Interface quality, responsiveness, user experience" },
  { key: "communicationScore", label: "Communication", description: "Documentation, comments, clarity of explanation" },
]

// Weight configuration for each dimension (total = 100)
const WEIGHTS: Record<string, number> = {
  executionScore: 0.25,
  architectureScore: 0.15,
  thoughtProcessScore: 0.15,
  aiUsageScore: 0.10,
  deploymentScore: 0.10,
  codeOrganizationScore: 0.10,
  uiUxScore: 0.08,
  communicationScore: 0.07,
}

interface EvaluationFormProps {
  submissionId: string
  onComplete?: () => void
  initialData?: {
    executionScore?: number
    architectureScore?: number
    thoughtProcessScore?: number
    aiUsageScore?: number
    deploymentScore?: number
    codeOrganizationScore?: number
    uiUxScore?: number
    communicationScore?: number
    totalScore?: number
    notes?: string | null
  }
}

function SliderInput({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tabular-nums min-w-[2ch] text-right">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">/ 10</span>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          bg-secondary accent-primary
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-background"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        <span>Poor</span>
        <span>Average</span>
        <span>Excellent</span>
      </div>
    </div>
  )
}

export default function EvaluationForm({ submissionId, onComplete, initialData }: EvaluationFormProps) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    DIMENSIONS.forEach((d) => {
      const key = d.key as keyof NonNullable<EvaluationFormProps["initialData"]>
      const val = initialData?.[key]
      initial[d.key] = typeof val === "number" ? val : 5
    })
    return initial
  })
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  const [submitting, setSubmitting] = useState(false)

  function calculateTotal(scores: Record<string, number>): number {
    let total = 0
    for (const d of DIMENSIONS) {
      total += (scores[d.key] / 10) * WEIGHTS[d.key] * 100
    }
    return Math.round(total * 10) / 10
  }

  const totalScore = calculateTotal(scores)

  function updateScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const payload = {
        ...scores,
        totalScore,
        notes: notes || null,
      }

      const url = initialData
        ? `/api/admin/evaluations/${submissionId}`
        : "/api/admin/evaluations"

      const method = initialData ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "POST"
            ? { ...payload, submissionId }
            : payload
        ),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save evaluation")
      }

      toast.success(initialData ? "Evaluation updated" : "Evaluation submitted")
      onComplete?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save evaluation")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {DIMENSIONS.map((dim) => (
          <SliderInput
            key={dim.key}
            label={dim.label}
            description={dim.description}
            value={scores[dim.key]}
            onChange={(v) => updateScore(dim.key, v)}
          />
        ))}

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-medium">Total Score</span>
              <p className="text-xs text-muted-foreground">Weighted out of 100</p>
            </div>
            <span className="text-2xl font-bold tabular-nums">{totalScore}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Evaluator Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Brief notes about the submission..."
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "Saving..." : initialData ? "Update Evaluation" : "Submit Evaluation"}
        </Button>
      </CardContent>
    </Card>
  )
}
