"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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

interface SubmissionData {
  id: string
  assignedProblemId: string
  gitUrl: string | null
  liveUrl: string | null
  submittedAt: string
  elapsedSeconds: number | null
  assignedProblem: {
    status: string
    template: {
      title: string
      category: string
      difficulty: number
    }
  }
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export default function SubmissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role === "CANDIDATE") {
      fetchSubmissions()
    } else if (status === "authenticated") {
      setLoading(false)
    }
  }, [status, session, router])

  async function fetchSubmissions() {
    try {
      // Get all assigned problems with submissions
      const res = await fetch("/api/candidate/problems")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      const problems = data.problems || []

      // Filter to only submitted ones and map to submission-like format
      const subs = problems
        .filter((p: any) => p.status === "SUBMITTED")
        .map((p: any) => ({
          id: p.id,
          assignedProblemId: p.id,
          gitUrl: null, // We don't have this from the problems endpoint
          liveUrl: null,
          submittedAt: p.assignedAt,
          elapsedSeconds: null,
          assignedProblem: {
            status: p.status,
            template: p.template,
          },
        }))
      setSubmissions(subs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(seconds: number | null): string {
    if (!seconds) return "—"
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Submissions</h1>
        <p className="mt-1 text-muted-foreground">
          Track your submitted solutions
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t submitted any solutions yet.
            </p>
            <Link href="/problems">
              <Button>View Problems</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">
                      {sub.assignedProblem.template.title}
                    </CardTitle>
                    <CardDescription>
                      {sub.assignedProblem.template.category.replace("-", " ")} · Difficulty: {sub.assignedProblem.template.difficulty}/5
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Submitted
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="ml-2">
                      {new Date(sub.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Elapsed:</span>
                    <span className="ml-2">{formatTime(sub.elapsedSeconds)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
