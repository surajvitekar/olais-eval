"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import LoadingSpinner from "@/components/shared/LoadingSpinner"

interface SkillProfile {
  id: string
  scores: Record<string, number>
  topSkills: string[]
  generatedAt: string
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

const categoryColors: Record<string, string> = {
  FRONTEND: "#3b82f6",
  BACKEND: "#10b981",
  PYTHON: "#f59e0b",
  AI_ML: "#8b5cf6",
  API: "#ec4899",
  DATABASE: "#06b6d4",
  DEVOPS: "#f97316",
  UI_UX: "#14b8a6",
  AUTOMATION: "#6366f1",
  SYSTEM_DESIGN: "#ef4444",
}

function AssessmentCompleteContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileId = searchParams.get("profileId")

  const [profile, setProfile] = useState<SkillProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated") {
      if (profileId) {
        // Try to fetch profile directly
        fetchProfile()
      } else {
        setLoading(false)
        setError("No profile data available")
      }
    }
  }, [status, profileId, router])

  async function fetchProfile() {
    try {
      // We can get the latest profile from a dedicated endpoint or from session
      // For now, we'll complete the assessment again if needed
      const res = await fetch("/api/candidate/assessment/complete", {
        method: "POST",
      })

      if (!res.ok) {
        // Profile might already exist - try to get it from user data
        // The profile was created during submit/complete flow
        throw new Error("Could not load profile")
      }

      const data = await res.json()
      setProfile(data.profile)
    } catch {
      // If the complete endpoint fails (e.g., already completed),
      // display what we know
      setError("Could not load detailed profile. Your assessment was submitted successfully.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const scores = profile?.scores || {}
  const topSkills = profile?.topSkills || []
  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Assessment Complete!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your skill profile has been generated. Here&apos;s a summary of your
          results.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          {error}
        </div>
      )}

      {/* Top 3 Skills */}
      {topSkills.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top Skills</CardTitle>
            <CardDescription>
              Your strongest areas based on the assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {topSkills.slice(0, 3).map((skill, idx) => (
                <div
                  key={skill}
                  className="flex items-center gap-2 rounded-full border px-4 py-2"
                  style={{
                    borderColor: categoryColors[skill] || "#888",
                    backgroundColor: `${categoryColors[skill] || "#888"}10`,
                  }}
                >
                  <span
                    className="flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: categoryColors[skill] || "#888" }}
                  />
                  <span className="text-sm font-medium">
                    {idx + 1}. {categoryLabels[skill] || skill}
                  </span>
                  <span className="text-sm font-bold">
                    {scores[skill]?.toFixed(1) || "0"}/10
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart of All Categories */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>All Category Scores</CardTitle>
          <CardDescription>
            Your scores across all skill categories (0-10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedScores.map(([category, score]) => (
              <div key={category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{categoryLabels[category] || category}</span>
                  <span className="font-medium">{score.toFixed(1)}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${(score / 10) * 100}%`,
                      backgroundColor: categoryColors[category] || "#888",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Radar/Radar Chart Alternative - Simple visual */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>
            Visual overview of your skill profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-4">
            {sortedScores.map(([category, score]) => (
              <div
                key={category}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="relative flex h-20 w-20 items-end justify-center overflow-hidden rounded-full border-2"
                  style={{ borderColor: categoryColors[category] || "#888" }}
                >
                  <div
                    className="absolute bottom-0 w-full transition-all duration-1000"
                    style={{
                      height: `${(score / 10) * 100}%`,
                      backgroundColor: `${categoryColors[category] || "#888"}30`,
                    }}
                  />
                  <span className="relative z-10 text-lg font-bold">
                    {score.toFixed(1)}
                  </span>
                </div>
                <span className="text-center text-xs text-muted-foreground max-w-16 leading-tight">
                  {categoryLabels[category] || category}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push("/problems")}>
            Continue to Problems
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function AssessmentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <AssessmentCompleteContent />
    </Suspense>
  )
}
