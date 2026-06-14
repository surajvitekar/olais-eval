"use client"

import { useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { toast } from "sonner"
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
} from "lucide-react"
import Link from "next/link"

interface PreviewRow {
  email: string
  name: string | null
  phone: string | null
}

interface ColumnMapping {
  [key: string]: string
}

interface UploadResult {
  successCount: number
  errorCount: number
  totalRows: number
  errors: { row: number; email: string; message: string }[]
  createdCodes: string[]
}

type PageStep = "upload" | "preview" | "processing" | "results"

export default function BulkInvitePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<PageStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // CSV preview
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [validCount, setValidCount] = useState(0)
  const [invalidCount, setInvalidCount] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})

  // Column mapping editor
  const [editingMapping, setEditingMapping] = useState(false)
  const [editMapping, setEditMapping] = useState<Record<string, string>>({})

  // Upload progress & results
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploading, setUploading] = useState(false)

  // Auth guard
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    router.push("/login")
    return null
  }

  // ─── File Handling ───────────────────────────────────────────────────────────

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a CSV file")
      return
    }

    setFile(file)
    previewFile(file)
  }

  function previewFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) {
        toast.error("Could not read file")
        return
      }

      // Parse the CSV client-side for preview using a simple split approach
      const lines = text.split("\n").filter((l) => l.trim())
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row")
        return
      }

      const headerRow = lines[0]
      const parsedHeaders = parseCsvLine(headerRow)
      setHeaders(parsedHeaders)

      const mapping = detectColumnMapping(parsedHeaders)
      setColumnMapping(mapping)
      setEditMapping({ ...mapping })

      // Parse data rows
      const dataRows: PreviewRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])
        const row: Record<string, string> = {}
        parsedHeaders.forEach((h, idx) => {
          row[h] = values[idx] || ""
        })

        const emailCol = Object.entries(mapping).find(([, v]) => v === "email")?.[0]
        const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0]
        const phoneCol = Object.entries(mapping).find(([, v]) => v === "phone")?.[0]

        const email = emailCol ? (row[emailCol] || "").trim() : ""
        const name = nameCol ? (row[nameCol] || "").trim() || null : null
        const phone = phoneCol ? (row[phoneCol] || "").trim() || null : null

        if (email) {
          dataRows.push({ email, name, phone })
        }
      }

      setPreviewRows(dataRows.slice(0, 10))
      setTotalRows(dataRows.length)
      setValidCount(dataRows.length)
      setInvalidCount(0)

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      let valid = 0
      let invalid = 0
      for (const row of dataRows) {
        if (emailRegex.test(row.email)) {
          valid++
        } else {
          invalid++
        }
      }
      setValidCount(valid)
      setInvalidCount(invalid)

      setStep("preview")
    }
    reader.readAsText(file)
  }

  function parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  function detectColumnMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {}

    for (const header of headers) {
      const lower = header.toLowerCase().trim()

      if (
        lower.includes("email") ||
        lower === "e" ||
        lower === "mail"
      ) {
        mapping[header] = "email"
      } else if (
        lower === "name" ||
        lower === "candidate name" ||
        lower === "candidate_name" ||
        lower === "full name" ||
        lower === "full_name" ||
        lower === "candidate" ||
        lower.includes("name")
      ) {
        mapping[header] = "name"
      } else if (
        lower.includes("phone") ||
        lower.includes("mobile") ||
        lower === "tel" ||
        lower === "telephone" ||
        lower === "contact"
      ) {
        mapping[header] = "phone"
      } else {
        mapping[header] = "skip"
      }
    }

    return mapping
  }

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFile(droppedFile)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  // ─── Column Mapping ──────────────────────────────────────────────────────────

  function handleMappingChange(header: string, value: string) {
    setEditMapping((prev) => ({ ...prev, [header]: value }))
  }

  function applyMapping() {
    // Validate that exactly one email column is mapped
    const emailCols = Object.values(editMapping).filter((v) => v === "email")
    if (emailCols.length === 0) {
      toast.error("You must map at least one column as 'email'")
      return
    }

    setColumnMapping({ ...editMapping })
    setEditingMapping(false)

    // Re-preview with new mapping
    if (file) {
      previewFileWithMapping(file, editMapping)
    }
  }

  function previewFileWithMapping(file: File, mapping: ColumnMapping) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return

      const lines = text.split("\n").filter((l) => l.trim())
      if (lines.length < 2) return

      const headerRow = lines[0]
      const parsedHeaders = parseCsvLine(headerRow)

      const dataRows: PreviewRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])
        const row: Record<string, string> = {}
        parsedHeaders.forEach((h, idx) => {
          row[h] = values[idx] || ""
        })

        const emailCol = Object.entries(mapping).find(([, v]) => v === "email")?.[0]
        const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0]
        const phoneCol = Object.entries(mapping).find(([, v]) => v === "phone")?.[0]

        const email = emailCol ? (row[emailCol] || "").trim() : ""
        const name = nameCol ? (row[nameCol] || "").trim() || null : null
        const phone = phoneCol ? (row[phoneCol] || "").trim() || null : null

        if (email) {
          dataRows.push({ email, name, phone })
        }
      }

      setPreviewRows(dataRows.slice(0, 10))
      setTotalRows(dataRows.length)

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      let valid = 0
      let invalid = 0
      for (const row of dataRows) {
        if (emailRegex.test(row.email)) {
          valid++
        } else {
          invalid++
        }
      }
      setValidCount(valid)
      setInvalidCount(invalid)
    }
    reader.readAsText(file)
  }

  // ─── Upload ──────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!file) {
      toast.error("No file selected")
      return
    }

    // Validate mapping has an email column
    const hasEmail = Object.values(columnMapping).some((v) => v === "email")
    if (!hasEmail) {
      toast.error("You must map a column as 'email'")
      return
    }

    setStep("processing")
    setUploading(true)
    setProgress(0)

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("columnMapping", JSON.stringify(columnMapping))

      const res = await fetch("/api/admin/invites/bulk", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(errData.error || "Upload failed")
      }

      const data: UploadResult = await res.json()
      setResult(data)

      if (data.successCount > 0) {
        toast.success(`Successfully created ${data.successCount} invite(s)`)
      }
      if (data.errorCount > 0) {
        toast.error(`${data.errorCount} row(s) had errors`)
      }

      setStep("results")
    } catch (err) {
      clearInterval(progressInterval)
      toast.error(err instanceof Error ? err.message : "Upload failed")
      setStep("preview")
    } finally {
      setUploading(false)
    }
  }

  // ─── Download Error CSV ──────────────────────────────────────────────────────

  function downloadErrorCsv() {
    if (!result || result.errors.length === 0) return

    const headers = ["Row", "Email", "Error"]
    const csvLines = [headers.join(",")]
    for (const err of result.errors) {
      const escapedEmail = `"${err.email.replace(/"/g, '""')}"`
      const escapedMsg = `"${err.message.replace(/"/g, '""')}"`
      csvLines.push(`${err.row},${escapedEmail},${escapedMsg}`)
    }

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bulk-invite-errors-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ─── Reset ───────────────────────────────────────────────────────────────────

  function resetAll() {
    setStep("upload")
    setFile(null)
    setPreviewRows([])
    setTotalRows(0)
    setValidCount(0)
    setInvalidCount(0)
    setHeaders([])
    setColumnMapping({})
    setResult(null)
    setProgress(0)
    setEditingMapping(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ─── Render: Upload Step ─────────────────────────────────────────────────────

  function renderUpload() {
    return (
      <div className="space-y-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">
                Drop your CSV file here, or click to browse
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                CSV must have columns: email, name (optional), phone (optional)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Only .csv files are accepted</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format Guide</CardTitle>
            <CardDescription>
              Your CSV should include a header row with at least an email column.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted p-4 font-mono text-sm">
              <p>email,name,phone</p>
              <p>john@example.com,John Doe,+1234567890</p>
              <p>jane@example.com,Jane Smith,</p>
              <p>bob@example.com,Bob Johnson,+9876543210</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• <strong>email</strong> (required) — candidate email address</p>
              <p>• <strong>name</strong> (optional) — candidate full name</p>
              <p>• <strong>phone</strong> (optional) — candidate phone number</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render: Preview Step ────────────────────────────────────────────────────

  function renderPreview() {
    return (
      <div className="space-y-6">
        {/* File info */}
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <FileText className="h-8 w-8 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {totalRows} row(s) · {validCount} valid · {invalidCount} invalid
            </p>
          </div>
          <Badge variant={invalidCount > 0 ? "destructive" : "default"}>
            {validCount} / {totalRows} valid
          </Badge>
        </div>

        {/* Column Mapping */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Column Mapping</CardTitle>
              <CardDescription>
                Map CSV columns to invite fields
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingMapping(!editingMapping)}
            >
              {editingMapping ? "Done Mapping" : "Edit Mapping"}
            </Button>
          </CardHeader>
          <CardContent>
            {editingMapping ? (
              <div className="space-y-3">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="w-1/3 text-sm font-medium truncate">
                      {header}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      value={editMapping[header] || "skip"}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="flex h-9 w-1/3 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="skip">Skip</option>
                      <option value="email">Email</option>
                      <option value="name">Name</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={applyMapping}>
                    Apply Mapping
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(columnMapping)
                  .filter(([, v]) => v !== "skip")
                  .map(([header, field]) => (
                    <Badge key={header} variant="outline" className="gap-1">
                      <span className="font-mono text-xs">{header}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="capitalize">{field}</span>
                    </Badge>
                  ))}
                {Object.values(columnMapping).filter((v) => v === "email").length ===
                  0 && (
                  <p className="text-sm text-destructive">
                    No email column mapped! Edit mapping above.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Preview ({previewRows.length} of {totalRows} rows)</CardTitle>
            <CardDescription>
              First {Math.min(10, totalRows)} rows shown. Review before uploading.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewRows.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No valid rows to preview
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Valid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, idx) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    const valid = emailRegex.test(row.email)
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-muted-foreground">
                          {idx + 2}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.email}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.phone || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={resetAll}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {validCount} valid invite(s) will be created
            </p>
            <Button onClick={handleUpload} disabled={validCount === 0 || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {validCount} Invite(s)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Processing Step ─────────────────────────────────────────────────

  function renderProcessing() {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Processing invites...</p>
          <p className="text-sm text-muted-foreground">
            Creating invite codes and validating entries
          </p>
        </div>
        <div className="w-full max-w-md">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            {progress}%
          </p>
        </div>
      </div>
    )
  }

  // ─── Render: Results Step ────────────────────────────────────────────────────

  function renderResults() {
    if (!result) return null
    const hasErrors = result.errors.length > 0
    const successRate =
      result.totalRows > 0
        ? Math.round((result.successCount / result.totalRows) * 100)
        : 0

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className={result.successCount > 0 ? "border-green-200" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {result.successCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                invite(s) created
              </p>
            </CardContent>
          </Card>

          <Card className={hasErrors ? "border-red-200" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">
                {result.errorCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                row(s) with errors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{result.totalRows}</p>
              <p className="text-xs text-muted-foreground mt-1">
                total row(s) processed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Success rate bar */}
        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{successRate}% success rate</span>
                <span className="text-muted-foreground">
                  {result.successCount} / {result.totalRows}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Created Codes */}
        {result.createdCodes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Created Invite Codes</CardTitle>
              <CardDescription>
                {result.createdCodes.length} code(s) generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.createdCodes.map((code, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {code.substring(0, 8)}...
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Report */}
        {hasErrors && (
          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-destructive">Error Report</CardTitle>
                <CardDescription>
                  {result.errors.length} row(s) failed validation or creation
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadErrorCsv}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Error CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-muted-foreground">
                          {err.row}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {err.email || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-destructive">
                          {err.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetAll}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Another File
          </Button>
          <Link
            href="/admin/invites"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invites
          </Link>
        </div>
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/admin/invites" className="hover:text-foreground transition-colors">
            Invites
          </Link>
          <span>/</span>
          <span className="text-foreground">Bulk Upload</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Invite Upload</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a CSV file to create multiple invite codes at once
        </p>
      </div>

      {step === "upload" && renderUpload()}
      {step === "preview" && renderPreview()}
      {step === "processing" && renderProcessing()}
      {step === "results" && renderResults()}
    </div>
  )
}
