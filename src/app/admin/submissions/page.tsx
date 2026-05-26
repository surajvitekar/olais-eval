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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { toast } from "sonner"

interface AdminSubmission {
  id: string
  userId: string
  assignedProblemId: string
  gitUrl: string | null
  liveUrl: string | null
  submittedAt: string
  elapsedSeconds: number | null
  user: {
    id: string
    name: string | null
    email: string
  }
  assignedProblem: {
    status: string
    template: {
      title: string
      category: string
      difficulty: number
    }
  }
  evaluations: Array<{
    id: string
    totalScore: number
    status: string
  }>
}

export default function AdminSubmissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [submissions, setSubmissions] = useState<AdminSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [problemFilter, setProblemFilter] = useState("")
  const [candidateFilter, setCandidateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("") // evaluated | pending | all
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

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
      fetchSubmissions()
    }
  }, [status, session, router, page, problemFilter, candidateFilter, statusFilter])

  async function fetchSubmissions() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "20")
      if (problemFilter) params.set("problem", problemFilter)
      if (candidateFilter) params.set("candidate", candidateFilter)
      if (statusFilter) params.set("evalStatus", statusFilter)

      const res = await fetch(`/api/admin/submissions?${params}`)
      if (!res.ok) throw new Error("Failed to fetch submissions")
      const data = await res.json()
      setSubmissions(data.submissions)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      toast.error("Failed to load submissions")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All Submissions</h1>
        <p className="mt-1 text-muted-foreground">
          Review and evaluate candidate submissions
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-[200px]">
              <Select
                value={statusFilter}
                onValueChange={(v) => { if (v !== null) { setStatusFilter(v); setPage(1) } }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All submissions</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="evaluated">Evaluated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]" />
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Submissions ({submissions.length})</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner text="Loading submissions..." />
          ) : submissions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No submissions found
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => {
                    const lastEval = sub.evaluations[sub.evaluations.length - 1]
                    const hasEval = !!lastEval

                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.user.name || sub.user.email}
                        </TableCell>
                        <TableCell>
                          {sub.assignedProblem.template.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sub.assignedProblem.template.category.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {hasEval ? (
                            <span className="font-medium">
                              {lastEval.totalScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasEval ? (
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
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
