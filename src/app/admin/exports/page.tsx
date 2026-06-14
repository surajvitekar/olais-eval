"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { Separator } from "@/components/ui/separator"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { toast } from "sonner"
import {
  Download,
  FileText,
  FileSpreadsheet,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react"

interface ExportableEvaluation {
  id: string
  totalScore: number
  status: string
  createdAt: string
  evaluator: { name: string | null; email: string }
  submission: {
    id: string
    user: { id: string; name: string | null; email: string }
    assignedProblem: {
      template: { title: string; category: string }
    }
    submittedAt: string
  }
}

export default function AdminExportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [evaluations, setEvaluations] = useState<ExportableEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [exportingPdf, setExportingPdf] = useState<string | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)

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
      fetchEvaluations()
    }
  }, [status, session, router])

  async function fetchEvaluations() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/evaluations?limit=200")
      if (!res.ok) throw new Error("Failed to fetch evaluations")
      const data = await res.json()
      setEvaluations(data.evaluations || [])
    } catch (err) {
      toast.error("Failed to load evaluations")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportPdf(evaluationId: string) {
    setExportingPdf(evaluationId)
    try {
      const res = await fetch(
        `/api/admin/export-results?format=pdf&evaluationId=${evaluationId}`
      )
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to generate PDF")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `evaluation-${evaluationId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("PDF exported successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export PDF")
      console.error(err)
    } finally {
      setExportingPdf(null)
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true)
    try {
      const res = await fetch("/api/admin/export-results?format=csv")
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to generate CSV")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `evaluation-results-${dateStr}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("CSV exported successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export CSV")
      console.error(err)
    } finally {
      setExportingCsv(false)
    }
  }

  const completedEvalCount = evaluations.filter(
    (e) => e.status === "COMPLETED"
  ).length

  const filteredEvaluations = evaluations.filter((ev) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const candidateName =
      ev.submission.user.name?.toLowerCase() ?? ""
    const candidateEmail = ev.submission.user.email.toLowerCase()
    const problemTitle =
      ev.submission.assignedProblem.template.title.toLowerCase()
    return (
      candidateName.includes(q) ||
      candidateEmail.includes(q) ||
      problemTitle.includes(q)
    )
  })

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Score Card Exports
        </h1>
        <p className="mt-1 text-muted-foreground">
          Export candidate evaluation results as PDF (single) or CSV (batch)
        </p>
      </div>

      {/* Batch Export Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Batch Cycle Export
          </CardTitle>
          <CardDescription>
            Download all completed evaluations as a CSV spreadsheet — includes
            dimension scores, composite scores, evaluator notes, and problem
            details for every evaluated candidate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">
                {completedEvalCount} completed evaluation{completedEvalCount !== 1 ? "s" : ""}{" "}
                available for export
              </span>
            </div>
            <Button
              onClick={handleExportCsv}
              disabled={exportingCsv || completedEvalCount === 0}
              size="lg"
              className="gap-2"
            >
              {exportingCsv ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {exportingCsv
                ? "Generating CSV..."
                : `Export All as CSV (${completedEvalCount})`}
            </Button>
          </div>
          {completedEvalCount === 0 && !loading && (
            <p className="mt-3 text-xs text-muted-foreground">
              No completed evaluations yet. Evaluations must be marked as
              COMPLETED before they can be exported.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator className="mb-6" />

      {/* Single Export Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Individual PDF Export
          </h2>
          <p className="text-sm text-muted-foreground">
            Select a candidate evaluation to export a detailed PDF score card
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or problem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Evaluations{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredEvaluations.length} shown)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner text="Loading evaluations..." />
          ) : filteredEvaluations.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No evaluations match your search"
                  : "No evaluations found"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Evaluator</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvaluations.map((ev) => {
                  const candidate = ev.submission.user
                  const template =
                    ev.submission.assignedProblem.template

                  return (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">
                        {candidate.name || candidate.email}
                        {candidate.name && (
                          <span className="block text-xs text-muted-foreground">
                            {candidate.email}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{template.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {ev.status === "COMPLETED"
                          ? `${Math.round(ev.totalScore)}/100`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {ev.evaluator.name || ev.evaluator.email}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ev.status === "COMPLETED"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {ev.status === "COMPLETED"
                            ? "Completed"
                            : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            ev.status !== "COMPLETED" ||
                            exportingPdf === ev.id
                          }
                          onClick={() => handleExportPdf(ev.id)}
                          className="gap-1.5"
                        >
                          {exportingPdf === ev.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
