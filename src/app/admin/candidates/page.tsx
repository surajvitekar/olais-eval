"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface Candidate {
  id: string
  name: string | null
  email: string
  status: string
  phone: string | null
  college: string | null
  createdAt: string
  skillProfiles: Array<{
    scores: Record<string, number>
    topSkills: string[]
  }>
  assignedProblems: Array<{
    id: string
    status: string
  }>
  submissions: Array<{
    id: string
  }>
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

const STATUS_LABELS: Record<string, string> = {
  REGISTERED: "Registered",
  ASSESSMENT_COMPLETED: "Assessment Done",
  PROBLEM_ASSIGNED: "Problems Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  SELECTED: "Selected",
}

export default function AdminCandidatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
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
      fetchCandidates()
    }
  }, [status, session, router, page, search, statusFilter])

  async function fetchCandidates() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "20")
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/admin/candidates?${params}`)
      if (!res.ok) throw new Error("Failed to fetch candidates")
      const data = await res.json()
      setCandidates(data.candidates)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      toast.error("Failed to load candidates")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
        <p className="mt-1 text-muted-foreground">
          Manage and review candidate profiles
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="w-[180px]">
              <Select
                value={statusFilter}
                onValueChange={(v) => { if (v !== null) { setStatusFilter(v); setPage(1) } }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Candidates ({candidates.length})</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner text="Loading candidates..." />
          ) : candidates.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No candidates found
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Problems</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">
                        {candidate.name || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {candidate.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            STATUS_COLORS[candidate.status] || ""
                          }`}
                        >
                          {STATUS_LABELS[candidate.status] || candidate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {candidate.assignedProblems.length}
                      </TableCell>
                      <TableCell>
                        {candidate.submissions.length}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skillProfiles.length > 0 &&
                            candidate.skillProfiles[0].topSkills
                              .slice(0, 3)
                              .map((skill) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {skill}
                                </Badge>
                              ))}
                          {candidate.skillProfiles.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/candidates/${candidate.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
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
