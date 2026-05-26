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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { Users, FileText, CheckCircle2, Clock, TrendingUp, Activity } from "lucide-react"
import { toast } from "sonner"

interface StatsData {
  totals: {
    totalCandidates: number
    totalSubmissions: number
    totalEvaluations: number
    pendingEvaluations: number
    completedEvaluations: number
    totalAssigned: number
    selectedCount: number
    selectionRate: number
  }
  byStatus: Record<string, number>
  recentActivity: Array<{
    id: string
    action: string
    user: { id: string; name: string | null; email: string } | null
    metadata: Record<string, unknown>
    createdAt: string
  }>
  recentSubmissions: Array<{
    id: string
    userName: string
    userId: string
    problemTitle: string
    problemSlug: string
    submittedAt: string
    hasEvaluation: boolean
  }>
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchStats()
    }
  }, [status, session, router])

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("Failed to fetch stats")
      const data = await res.json()
      setStats(data.stats)
    } catch (err) {
      toast.error("Failed to load dashboard data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    )
  }

  const { totals, byStatus, recentSubmissions, recentActivity } = stats

  const statCards = [
    {
      title: "Total Candidates",
      value: totals.totalCandidates,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Assigned Problems",
      value: totals.totalAssigned,
      icon: FileText,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Submissions",
      value: totals.totalSubmissions,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Evaluated",
      value: totals.completedEvaluations,
      icon: Activity,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "Pending Review",
      value: totals.pendingEvaluations + (totals.totalSubmissions - totals.totalEvaluations),
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      title: "Selection Rate",
      value: `${totals.selectionRate}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of the evaluation campaign
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${card.bg}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Status Distribution */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Candidate Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of candidate pipeline stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(byStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground">No candidates yet</p>
              ) : (
                Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {status.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${(count / totals.totalCandidates) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                recentActivity.slice(0, 10).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Badge variant="outline" className="shrink-0 mt-0.5">
                      {activity.action.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        {activity.user?.name || activity.user?.email || "System"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>
            Latest candidate submissions requiring evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No submissions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubmissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.userName}</TableCell>
                    <TableCell>{sub.problemTitle}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(sub.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {sub.hasEvaluation ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Evaluated
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/submissions/${sub.id}`}>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
