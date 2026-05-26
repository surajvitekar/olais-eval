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
import { toast } from "sonner"

interface Problem {
  id: string
  title: string
  slug: string
  category: string
  difficulty: number
  isActive: boolean
  variantGroup: string | null
  createdAt: string
}

const CATEGORIES = [
  "full-stack",
  "automation",
  "ai-workflows",
  "apis",
  "dashboards",
  "data",
  "tooling",
  "agentic",
  "ocr",
  "monitoring",
  "ai-utilities",
]

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export default function AdminProblemsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [showActive, setShowActive] = useState<string>("true")
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
      fetchProblems()
    }
  }, [status, session, router, page, search, category, showActive])

  async function fetchProblems() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "20")
      if (search) params.set("search", search)
      if (category) params.set("category", category)
      if (showActive) params.set("active", showActive)

      const res = await fetch(`/api/admin/problems?${params}`)
      if (!res.ok) throw new Error("Failed to fetch problems")
      const data = await res.json()
      setProblems(data.problems)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      toast.error("Failed to load problems")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/problems/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(currentActive ? "Problem deactivated" : "Problem activated")
      fetchProblems()
    } catch (err) {
      toast.error("Failed to toggle problem status")
      console.error(err)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Problem Bank</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage evaluation problems
          </p>
        </div>
        <Link href="/admin/problems/new">
          <Button>Create Problem</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by title or slug..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="w-[180px]">
              <Select
                value={category}
                onValueChange={(v) => { if (v !== null) { setCategory(v); setPage(1); } }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Select
                value={showActive}
                onValueChange={(v) => { if (v !== null) { setShowActive(v); setPage(1); } }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Problems Table */}
      <Card>
        <CardHeader>
          <CardTitle>Problems ({problems.length})</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : problems.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No problems found. Create your first one.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Variant Group</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/problems/${problem.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {problem.title}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {problem.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {problem.category.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            DIFFICULTY_COLORS[problem.difficulty] ?? ""
                          }`}
                        >
                          {problem.difficulty}/5
                        </span>
                      </TableCell>
                      <TableCell>
                        {problem.isActive ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {problem.variantGroup || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/admin/problems/${problem.id}`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleActive(problem.id, problem.isActive)
                            }
                          >
                            {problem.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
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
