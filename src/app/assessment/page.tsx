"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import QuestionCard from "@/components/assessment/QuestionCard"
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/shared/LoadingSpinner"

interface Question {
  id: string
  category: string
  questionType: string
  questionText: string
  options: Record<string, any>
  weight: number
  displayOrder: number
}

export default function AssessmentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated") {
      fetchQuestions()
    }
  }, [status, router])

  async function fetchQuestions() {
    try {
      const res = await fetch("/api/candidate/assessment/questions")
      if (!res.ok) throw new Error("Failed to load questions")
      const data = await res.json()
      setQuestions(data.questions)
      // Initialize responses with defaults
      const initial: Record<string, any> = {}
      data.questions.forEach((q: Question) => {
        if (q.questionType === "AI_USAGE") {
          initial[q.id] = []
        }
      })
      setResponses(initial)
    } catch {
      setError("Failed to load assessment questions. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = useCallback((value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questions[currentIndex].id]: value,
    }))
  }, [currentIndex, questions])

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setReviewing(false)
    } else {
      setReviewing(true)
    }
  }, [currentIndex, questions.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setReviewing(false)
    }
  }, [currentIndex])

  function jumpToQuestion(index: number) {
    setCurrentIndex(index)
    setReviewing(false)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      // Submit responses
      const submitBody = questions.map((q) => ({
        questionId: q.id,
        responseValue: responses[q.id] ?? null,
      }))

      const submitRes = await fetch("/api/candidate/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: submitBody }),
      })

      if (!submitRes.ok) {
        const errData = await submitRes.json()
        throw new Error(errData.error || "Failed to submit responses")
      }

      // Complete assessment - triggers scoring
      const completeRes = await fetch("/api/candidate/assessment/complete", {
        method: "POST",
      })

      if (!completeRes.ok) {
        const errData = await completeRes.json()
        throw new Error(errData.error || "Failed to complete assessment")
      }

      const result = await completeRes.json()
      router.push(`/assessment/complete?profileId=${result.profile?.id || ""}`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setSubmitting(false)
    }
  }

  function isQuestionAnswered(questionId: string): boolean {
    const val = responses[questionId]
    if (val === undefined || val === null) return false
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === "string") return val.trim() !== ""
    if (typeof val === "number") return true
    return false
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchQuestions}>Retry</Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <p className="text-muted-foreground">No assessment questions available.</p>
      </div>
    )
  }

  const progress = ((currentIndex + 1) / questions.length) * 100
  const answeredCount = questions.filter((q) => isQuestionAnswered(q.id)).length

  // Review mode: show all questions summary
  if (reviewing) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Review Your Answers</h1>
        <p className="mb-6 text-muted-foreground">
          {answeredCount} of {questions.length} questions answered
        </p>

        <div className="mb-8 space-y-3">
          {questions.map((q, idx) => {
            const answered = isQuestionAnswered(q.id)
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => jumpToQuestion(idx)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  answered
                    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                    : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Q{idx + 1} — {q.category}
                    </span>
                    <p className="mt-1 text-sm">{q.questionText}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      answered ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {answered ? "Answered" : "Not answered"}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setReviewing(false)}>
            Continue Editing
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Assessment"}
          </Button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
            <span className="ml-2 text-xs">
              ({answeredCount} answered)
            </span>
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Navigation Dots */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => jumpToQuestion(idx)}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              idx === currentIndex
                ? "bg-primary"
                : isQuestionAnswered(q.id)
                  ? "bg-green-500"
                  : "bg-muted-foreground/30"
            }`}
            title={`Q${idx + 1}: ${isQuestionAnswered(q.id) ? "Answered" : "Not answered"}`}
          />
        ))}
      </div>

      {/* Question Card */}
      <QuestionCard
        question={currentQuestion}
        value={responses[currentQuestion.id]}
        onChange={handleChange}
        onNext={handleNext}
        onPrev={handlePrev}
        isFirst={currentIndex === 0}
        isLast={currentIndex === questions.length - 1}
      />
    </div>
  )
}
