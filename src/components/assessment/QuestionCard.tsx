"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Question {
  id: string
  category: string
  questionType: string
  questionText: string
  options: Record<string, any>
  weight: number
  displayOrder: number
}

interface QuestionCardProps {
  question: Question
  value: any
  onChange: (value: any) => void
  onNext: () => void
  onPrev: () => void
  isFirst: boolean
  isLast: boolean
}

const categoryLabels: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  PYTHON: "Python",
  AI_ML: "AI/ML",
  API: "API Design",
  DATABASE: "Database",
  DEVOPS: "DevOps",
  UI_UX: "UI/UX",
  AUTOMATION: "Automation",
  SYSTEM_DESIGN: "System Design",
}

export default function QuestionCard({
  question,
  value,
  onChange,
  onNext,
  onPrev,
  isFirst,
  isLast,
}: QuestionCardProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <div className="mb-4">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {categoryLabels[question.category] || question.category}
          </span>
          <span className="ml-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {questionTypeLabel(question.questionType)}
          </span>
        </div>

        <h3 className="mb-6 text-lg font-medium leading-relaxed">
          {question.questionText}
        </h3>

        <div className="mb-8">
          {renderQuestionInput(question, value, onChange)}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Question {question.displayOrder}
          </span>
          <Button onClick={onNext}>
            {isLast ? "Review Answers" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function questionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SELF_RATING: "Self Rating",
    MULTIPLE_CHOICE: "Multiple Choice",
    EXPERIENCE: "Experience",
    PROJECT_FAMILIARITY: "Project Familiarity",
    AI_USAGE: "AI Usage",
  }
  return labels[type] || type
}

function renderQuestionInput(
  question: Question,
  value: any,
  onChange: (value: any) => void
) {
  switch (question.questionType) {
    case "SELF_RATING":
      return renderSelfRating(question, value, onChange)
    case "MULTIPLE_CHOICE":
      return renderMultipleChoice(question, value, onChange)
    case "EXPERIENCE":
      return renderExperience(question, value, onChange)
    case "PROJECT_FAMILIARITY":
      return renderProjectFamiliarity(question, value, onChange)
    case "AI_USAGE":
      return renderAiUsage(question, value, onChange)
    default:
      return <p className="text-muted-foreground">Unknown question type</p>
  }
}

function renderSelfRating(
  question: Question,
  value: number | undefined,
  onChange: (val: number) => void
) {
  const min = question.options?.min ?? 1
  const max = question.options?.max ?? 10
  const labels = question.options?.labels ?? {}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{labels.low || "Low"}</span>
        <span>{labels.high || "High"}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value ?? Math.floor((min + max) / 2)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <span className="min-w-[2rem] text-center text-lg font-bold">
          {value ?? Math.floor((min + max) / 2)}
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(
          (num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                (value ?? Math.floor((min + max) / 2)) === num
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {num}
            </button>
          )
        )}
      </div>
    </div>
  )
}

function renderMultipleChoice(
  question: Question,
  value: string | undefined,
  onChange: (val: string) => void
) {
  const choices = question.options?.choices ?? []

  if (!choices.length) {
    return <p className="text-muted-foreground">No choices available</p>
  }

  return (
    <div className="space-y-3">
      {choices.map((choice: string) => (
        <button
          key={choice}
          type="button"
          onClick={() => onChange(choice)}
          className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
            value === choice
              ? "border-primary bg-primary/10 text-primary"
              : "border-input hover:border-primary/50 hover:bg-muted"
          }`}
        >
          {choice}
        </button>
      ))}
    </div>
  )
}

function renderExperience(
  question: Question,
  value: string | undefined,
  onChange: (val: string) => void
) {
  const levels = question.options?.levels ?? []
  const choices = question.options?.choices ?? []

  const options = levels.length > 0 ? levels : choices

  if (!options.length) {
    return <p className="text-muted-foreground">No options available</p>
  }

  return (
    <Select value={value || ""} onValueChange={(v) => onChange(v ?? value ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select your experience level" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function renderProjectFamiliarity(
  question: Question,
  value: string | undefined,
  onChange: (val: string) => void
) {
  const options = question.options?.values ?? ["yes", "no", "maybe"]

  return (
    <div className="flex gap-3">
      {options.map((option: string) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`flex-1 rounded-lg border p-4 text-center text-sm font-medium capitalize transition-colors ${
            value === option
              ? "border-primary bg-primary/10 text-primary"
              : "border-input hover:border-primary/50 hover:bg-muted"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function renderAiUsage(
  question: Question,
  value: string[] | undefined,
  onChange: (val: string[]) => void
) {
  const tools = question.options?.tools ?? []

  function toggleTool(tool: string) {
    const current = value ?? []
    if (current.includes(tool)) {
      onChange(current.filter((t) => t !== tool))
    } else {
      onChange([...current, tool])
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Select all that apply:
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {tools.map((tool: string) => {
          const selected = (value ?? []).includes(tool)
          return (
            <button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:border-primary/50 hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-input"
                  }`}
                >
                  {selected && (
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {tool}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
