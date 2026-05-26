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
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"

interface AssignedProblem {
  id: string
  status: string
  template: {
    id: string
    title: string
    slug: string
    category: string
    difficulty: number
    overview: string
  }
  assignedAt: string
  deadline: string | null
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const STATUS_BADGES: Record<string, string> = {
  ASSIGNED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  SUBMITTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export default function ProblemsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [problems, setProblems] = useState<AssignedProblem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated") {
      fetchProblems()
    }
  }, [status, router])

  async function fetchProblems() {
    try {
      const res = await fetch("/api/candidate/problems")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setProblems(data.problems || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Your Problems</h1>
        <p className="mt-1 text-muted-foreground">
          View and solve your assigned evaluation problems
        </p>
      </div>

      {problems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any assigned problems yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Complete your skill assessment first, then problems will be assigned
              based on your profile.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/assessment">
                <Button>Take Assessment</Button>
              </Link>
              <Link href="/instructions">
                <Button variant="outline">Read Instructions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {problems.map((ap) => (
            <Card key={ap.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{ap.template.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Category: {ap.template.category.replace("-", " ")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        DIFFICULTY_COLORS[ap.template.difficulty] ?? ""
                      }`}
                    >
                      {ap.template.difficulty}/5
                    </span>
                    <Badge
                      className={STATUS_BADGES[ap.status] || ""}
                    >
                      {ap.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {ap.template.overview}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Assigned: {new Date(ap.assignedAt).toLocaleDateString()}
                </span>
                <Link href={`/problems/${ap.id}`}>
                  <Button>
                    {ap.status === "SUBMITTED" ? "View Submission" : "View & Submit"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
