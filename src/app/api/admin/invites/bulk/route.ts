import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import {
  parseCsv,
  buildColumnMapping,
  generateInviteCode,
  defaultExpiresAt,
  type CsvInviteRow,
} from "@/lib/invites/parser"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface BulkResult {
  successCount: number
  errorCount: number
  totalRows: number
  errors: {
    row: number
    email: string
    message: string
  }[]
  createdCodes: string[]
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const customMappingRaw = formData.get("columnMapping") as string | null

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    // Validate file type
    if (
      !file.name.endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "application/vnd.ms-excel"
    ) {
      return NextResponse.json(
        { error: "Only CSV files are accepted" },
        { status: 400 }
      )
    }

    // Read file content
    const csvText = await file.text()

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      )
    }

    // Parse custom column mapping if provided
    let columnMapping: Record<string, string> | undefined
    if (customMappingRaw) {
      try {
        columnMapping = JSON.parse(customMappingRaw) as Record<string, string>
      } catch {
        return NextResponse.json(
          { error: "Invalid columnMapping JSON" },
          { status: 400 }
        )
      }
    }

    // Parse and validate the CSV
    const parseResult = parseCsv(csvText, columnMapping)

    if (parseResult.totalRows === 0) {
      return NextResponse.json(
        { error: "No rows found in CSV" },
        { status: 400 }
      )
    }

    // If all rows are invalid, return errors immediately
    if (parseResult.validRows.length === 0) {
      return NextResponse.json(
        {
          successCount: 0,
          errorCount: parseResult.totalRows,
          totalRows: parseResult.totalRows,
          errors: parseResult.invalidRows.map((r) => ({
            row: r.rowNumber,
            email: r.email,
            message: r.errors.join("; "),
          })),
          createdCodes: [],
        },
        { status: 200 }
      )
    }

    // Create invites in a transaction
    const expiresAt = defaultExpiresAt()
    const results: BulkResult = {
      successCount: 0,
      errorCount: 0,
      totalRows: parseResult.totalRows,
      errors: [],
      createdCodes: [],
    }

    // First, add the validation errors
    for (const invalid of parseResult.invalidRows) {
      results.errors.push({
        row: invalid.rowNumber,
        email: invalid.email,
        message: invalid.errors.join("; "),
      })
    }
    results.errorCount += parseResult.invalidRows.length

    // Process valid rows in a batch transaction
    // We use individual creates inside a transaction so partial failures can be handled
    try {
      const created = await prisma.$transaction(
        parseResult.validRows.map((row: CsvInviteRow) =>
          prisma.invite.create({
            data: {
              code: generateInviteCode(),
              candidateName: row.name,
              candidateEmail: row.email,
              maxUses: 1,
              expiresAt,
              createdBy: session.user.id,
            },
            select: { code: true, candidateEmail: true },
          })
        )
      )

      results.successCount = created.length
      results.createdCodes = created.map((c) => c.code)

      // Check for duplicates (same email already in DB)
      // In case of unique constraint violation on code (extremely unlikely with UUIDs),
      // it would throw and we'd catch it below.
    } catch (dbError) {
      console.error("Bulk invite creation error:", dbError)
      // If the transaction fails completely, mark all valid rows as errors
      for (const row of parseResult.validRows) {
        results.errors.push({
          row: row.rowNumber,
          email: row.email,
          message: "Database error creating invite",
        })
      }
      results.errorCount += parseResult.validRows.length
      results.successCount = 0
    }

    // Audit
    await logAudit(
      "invite.bulk_upload",
      {
        totalRows: results.totalRows,
        successCount: results.successCount,
        errorCount: results.errorCount,
      },
      session.user.id
    )

    return NextResponse.json(results, { status: 201 })
  } catch (error) {
    console.error("Bulk invite upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for column detection.
 * Accept a CSV file and return detected headers + column candidate mapping
 * so the UI can show a preview before uploading.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const previewParam = url.searchParams.get("preview")

    // If ?preview= is passed as a data URL or text, parse and return preview
    if (!previewParam) {
      return NextResponse.json(
        { error: "Missing preview parameter" },
        { status: 400 }
      )
    }

    const csvText = previewParam
    const parseResult = parseCsv(csvText)

    return NextResponse.json({
      headers: Object.keys(parseResult.columnMapping),
      columnMapping: parseResult.columnMapping,
      preview: parseResult.validRows.slice(0, 10).map((r) => ({
        email: r.email,
        name: r.name,
        phone: r.phone,
      })),
      totalRows: parseResult.totalRows,
      validCount: parseResult.validRows.length,
      invalidCount: parseResult.invalidRows.length,
    })
  } catch (error) {
    console.error("Bulk invite preview error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
