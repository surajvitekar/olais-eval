"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import Timer from "@/components/problems/Timer"
import SubmissionForm from "@/components/problems/SubmissionForm"
import Link from "next/link"

interface ProblemTemplate {
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
}

interface AssignedProblemData {
  id: string
  status: string
  template: ProblemTemplate
  assignedAt: string
  deadline: string | null
}

export default function ProblemDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const assignedId = params.id as string

  const [problem, setProblem] = useState<AssignedProblemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated") {
      fetchProblem()
    }
  }, [status, router, assignedId])

  async function fetchProblem() {
    try {
      const res = await fetch("/api/candidate/problems")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      const found = (data.problems || []).find(
        (p: AssignedProblemData) => p.id === assignedId
      )
      if (!found) {
        router.push("/problems")
        return
      }
      setProblem(found)
      if (found.status === "SUBMITTED") {
        setSubmitted(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Mark as IN_PROGRESS on first view
  useEffect(() => {
    if (problem && problem.status === "ASSIGNED") {
      fetch(`/api/candidate/problems/${problem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }).catch(() => {})
      // We'll update status client-side
      setProblem((prev) =>
        prev ? { ...prev, status: "IN_PROGRESS" } : prev
      )
    }
  }, [problem?.id])

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Problem not found.</p>
            <Link href="/problems">
              <Button className="mt-4">Back to Problems</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const t = problem.template

  if (submitted) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Submission Complete!</h2>
            <p className="text-muted-foreground mb-6">
              You have already submitted this problem.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/problems">
                <Button variant="outline">Back to Problems</Button>
              </Link>
              <Link href="/submissions">
                <Button>View Submissions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{t.category.replace("-", " ")}</Badge>
            <Badge>Difficulty: {t.difficulty}/5</Badge>
            <Badge
              className={
                problem.status === "IN_PROGRESS"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-purple-100 text-purple-800"
              }
            >
              {problem.status.replace("_", " ")}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        </div>
        <Timer />
      </div>

      {/* Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
            {t.overview}
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
          <CardDescription>
            What you need to build
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {t.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Constraints */}
      {t.constraints.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {t.constraints.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Bonus Features */}
      {t.bonusFeatures.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bonus Features (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {t.bonusFeatures.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">★</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Deliverables */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Deliverables</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {t.deliverables.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5">→</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Evaluation Criteria */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Evaluation Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {t.evaluationCriteria.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">✓</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Submission Form */}
      {!showForm ? (
        <div className="flex justify-center py-6">
          <Button size="lg" onClick={() => setShowForm(true)}>
            Start Submission
          </Button>
        </div>
      ) : (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle>Submit Your Solution</CardTitle>
            <CardDescription>
              Provide your repo URL, live URL, architecture notes, and AI declaration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionForm
              assignedProblemId={assignedId}
              onSuccess={() => {
                setSubmitted(true)
                router.push(`/problems/${assignedId}/submitted`)
              }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
