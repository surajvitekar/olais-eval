"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  EVALUATION_DIMENSIONS,
  calculateCompositeScore,
  getPerformanceLabel,
  getPerformanceColor,
  formatScoreBreakdown,
  EVALUATION_RUBRIC,
} from "@/lib/evaluations/scoring"
import type { DimensionKey, DimensionWeights } from "@/lib/evaluations/scoring"

const DIMENSIONS = EVALUATION_DIMENSIONS

interface EvaluationFormProps {
  submissionId: string
  onComplete?: () => void
  initialData?: {
    id?: string
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
  weights?: DimensionWeights
  showRubric?: boolean
}

function SliderInput({
  label,
  description,
  value,
  onChange,
  showRubric,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
  showRubric?: boolean
}) {
  const [showRubricDetail, setShowRubricDetail] = useState(false)
  const dimKey = EVALUATION_DIMENSIONS.find(
    (d) => d.label === label
  )?.key as DimensionKey | undefined
  const rubric = dimKey
    ? EVALUATION_RUBRIC.find((r) => r.key === dimKey)
    : undefined

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

      {/* Rubric display */}
      {showRubric && rubric && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowRubricDetail(!showRubricDetail)}
            className="text-xs text-primary hover:underline focus:outline-none"
          >
            {showRubricDetail ? "Hide rubric" : "Show rubric"}
          </button>
          {showRubricDetail && (
            <div className="mt-1.5 space-y-1 rounded-md border border-border bg-muted/50 p-2">
              {rubric.levels.map((level) => {
                const isCurrentLevel =
                  value >= level.range[0] && value <= level.range[1]
                return (
                  <div
                    key={level.label}
                    className={`flex items-start gap-2 text-xs ${
                      isCurrentLevel
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Badge
                      variant={isCurrentLevel ? "default" : "outline"}
                      className="shrink-0 text-[10px] px-1.5 py-0"
                    >
                      {level.label}
                      <span className="ml-0.5 opacity-70">
                        ({level.range[0]}-{level.range[1]})
                      </span>
                    </Badge>
                    <span>{level.criteria}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BreakdownTable({
  breakdown,
  totalScore,
}: {
  breakdown: ReturnType<typeof formatScoreBreakdown>
  totalScore: number
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Score Breakdown
      </h4>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-1.5 font-medium">Dimension</th>
              <th className="text-right px-2 py-1.5 font-medium">Score</th>
              <th className="text-right px-2 py-1.5 font-medium">Weight</th>
              <th className="text-right px-3 py-1.5 font-medium">Contrib.</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => (
              <tr
                key={row.key}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-1.5">{row.label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {row.score !== null ? `${row.score}/10` : "—"}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {Math.round(row.weight * 100)}%
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                  {row.weightedContribution}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 border-t-2 border-border">
              <td className="px-3 py-1.5 font-semibold">Total</td>
              <td className="px-2 py-1.5"></td>
              <td className="px-2 py-1.5"></td>
              <td className="px-3 py-1.5 text-right font-bold tabular-nums">
                {totalScore}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EvaluationForm({
  submissionId,
  onComplete,
  initialData,
  weights,
  showRubric = true,
}: EvaluationFormProps) {
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
  const [showBreakdown, setShowBreakdown] = useState(false)

  const totalScore = calculateCompositeScore(scores, weights)
  const performanceLabel = getPerformanceLabel(totalScore)
  const performanceColor = getPerformanceColor(totalScore)
  const breakdown = formatScoreBreakdown(scores, weights)
  const passingScore = 60

  const isPassing = totalScore >= passingScore

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

      const evaluationId = initialData?.id
      const url = evaluationId
        ? `/api/admin/evaluations/${evaluationId}`
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
        <CardDescription>
          Rate the submission on each dimension (1-10)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {DIMENSIONS.map((dim) => (
          <SliderInput
            key={dim.key}
            label={dim.label}
            description={dim.description}
            value={scores[dim.key]}
            onChange={(v) => updateScore(dim.key, v)}
            showRubric={showRubric}
          />
        ))}

        <div className="border-t pt-4 space-y-4">
          {/* Live total score with performance label */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Composite Score</span>
              <p className="text-xs text-muted-foreground">
                Weighted total out of 100
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {totalScore}
              </span>
              <Badge className={performanceColor}>
                {performanceLabel}
              </Badge>
            </div>
          </div>

          {/* Passing indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className={isPassing ? "text-green-600" : "text-red-600"}>
              {isPassing ? "✓" : "✗"}
            </span>
            <span className="text-muted-foreground">
              {isPassing
                ? "Passing (above minimum)"
                : `Below passing threshold (${passingScore})`}
            </span>
          </div>

          {/* Toggle breakdown */}
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs text-primary hover:underline focus:outline-none"
          >
            {showBreakdown ? "Hide detailed breakdown" : "Show detailed breakdown"}
          </button>
          {showBreakdown && <BreakdownTable breakdown={breakdown} totalScore={totalScore} />}

          {/* Notes */}
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
          {submitting
            ? "Saving..."
            : initialData
            ? "Update Evaluation"
            : "Submit Evaluation"}
        </Button>
      </CardContent>
    </Card>
  )
}
