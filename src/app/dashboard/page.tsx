"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
import Link from "next/link"

interface AssignedProblem {
  id: string
  status: string
  template: {
    title: string
    difficulty: number
    category: string
  }
  assignedAt: string
}

const STATUS_LABELS: Record<string, string> = {
  REGISTERED: "Registered",
  ASSESSMENT_COMPLETED: "Assessment Complete",
  PROBLEM_ASSIGNED: "Problems Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  SELECTED: "Selected",
}

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  ASSESSMENT_COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PROBLEM_ASSIGNED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  SUBMITTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  SHORTLISTED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  SELECTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [problems, setProblems] = useState<AssignedProblem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
    if (status === "authenticated" && session?.user?.role === "CANDIDATE") {
      fetchProblems()
    } else if (status === "authenticated") {
      setLoading(false)
    }
  }, [status, session, router])

  async function fetchProblems() {
    try {
      const res = await fetch("/api/candidate/problems")
      if (res.ok) {
        const data = await res.json()
        setProblems(data.problems || [])
      }
    } catch (err) {
      console.error("Failed to fetch problems", err)
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

  if (!session?.user) {
    return null
  }

  const user = session.user
  const isAdmin = user.role === "ADMIN"
  const userStatus = user.status as string

  // Determine next action
  function getNextAction() {
    if (isAdmin) return null
    switch (userStatus) {
      case "REGISTERED":
        return { text: "Complete your skill assessment", href: "/assessment", label: "Start Assessment" }
      case "ASSESSMENT_COMPLETED":
        return { text: "Get your problems assigned", href: "#", label: "Assign Problems", action: "assign" }
      case "PROBLEM_ASSIGNED":
      case "IN_PROGRESS":
        return problems.length > 0
          ? { text: "Continue working on your problems", href: "/problems", label: "View Problems" }
          : { text: "Check your assigned problems", href: "/problems", label: "View Problems" }
      case "SUBMITTED":
        return { text: "Your submission is under review", href: "/submissions", label: "View Submissions" }
      default:
        return { text: "Check your status", href: "/instructions", label: "Instructions" }
    }
  }

  async function handleAssignProblems() {
    try {
      const res = await fetch("/api/candidate/problems/assign", { method: "POST" })
      if (res.ok) {
        toastr("Problems assigned! Check your problem page.")
        fetchProblems()
        window.location.reload()
      } else {
        const data = await res.json()
        toastr(data.error || "Failed to assign problems")
      }
    } catch {
      toastr("Failed to assign problems")
    }
  }

  // Simple toast since sonner might not be available
  function toastr(msg: string) {
    // Use alert as fallback
    alert(msg)
  }

  const nextAction = getNextAction()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user.name || user.email}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin ? "Admin Dashboard" : "Candidate Dashboard"}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Your Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[userStatus] || ""}`}>
                {STATUS_LABELS[userStatus] || userStatus}
              </Badge>
              {nextAction && !nextAction.action && (
                <Link href={nextAction.href}>
                  <Button size="sm">{nextAction.label}</Button>
                </Link>
              )}
              {nextAction?.action === "assign" && (
                <Button size="sm" onClick={handleAssignProblems}>
                  {nextAction.label}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Action */}
        {nextAction && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Next Step</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3">{nextAction.text}</p>
              {nextAction.action !== "assign" && (
                <Link href={nextAction.href}>
                  <Button>{nextAction.label}</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>How to participate, submit, and get evaluated</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/instructions">
                <Button variant="outline" className="w-full">Read Instructions</Button>
              </Link>
            </CardContent>
          </Card>
          {!isAdmin && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Problems</CardTitle>
                  <CardDescription>Your assigned problems</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/problems">
                    <Button variant="outline" className="w-full">
                      {problems.length > 0 ? "View Problems" : "No problems yet"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Submissions</CardTitle>
                  <CardDescription>View your submission history</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/submissions">
                    <Button variant="outline" className="w-full">View Submissions</Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Problem Bank</CardTitle>
                <CardDescription>Create and manage evaluation problems</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/problems">
                  <Button variant="outline" className="w-full">Manage Problems</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
