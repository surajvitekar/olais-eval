"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import Link from "next/link"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
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

      <div className="grid gap-6 md:grid-cols-2">
        {isAdmin ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Invite Management</CardTitle>
                <CardDescription>
                  Create and manage candidate invitation codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/invites">
                  <Button className="w-full">Manage Invites</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Admin Overview</CardTitle>
                <CardDescription>
                  View all candidates and their progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  More admin features coming soon.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Skill Assessment</CardTitle>
                <CardDescription>
                  Complete your skill assessment to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/assessment">
                  <Button className="w-full">
                    {user.status === "ASSESSMENT_COMPLETED"
                      ? "View Results"
                      : "Start Assessment"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Problems</CardTitle>
                <CardDescription>
                  View and solve assigned coding problems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  {user.status === "ASSESSMENT_COMPLETED"
                    ? "Problems will be available after assessment."
                    : "Complete the assessment to unlock problems."}
                </p>
                <Link href="/problems">
                  <Button variant="outline" className="w-full">
                    View Problems
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
