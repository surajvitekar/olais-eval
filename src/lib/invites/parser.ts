import Papa from "papaparse"
import crypto from "crypto"

/**
 * Parsed and validated row from the CSV.
 */
export interface CsvInviteRow {
  rowNumber: number
  email: string
  name: string | null
  phone: string | null
}

/**
 * Result of validating a single row.
 */
export interface RowValidation {
  rowNumber: number
  email: string
  name: string | null
  phone: string | null
  valid: boolean
  errors: string[]
}

/**
 * Summary returned after parsing + validation.
 */
export interface ParseResult {
  rows: CsvInviteRow[]
  validRows: CsvInviteRow[]
  invalidRows: RowValidation[]
  totalRows: number
  columnMapping: Record<string, string>
}

/**
 * Column candidates auto-detected from CSV headers.
 */
export interface ColumnCandidates {
  email: string[]
  name: string[]
  phone: string[]
  unknown: string[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s\-+.()]{7,20}$/

/**
 * Detect likely column mappings from a header row.
 */
export function detectColumns(headers: string[]): ColumnCandidates {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim())

  const email = lowerHeaders.filter(
    (h) => h.includes("email") || h === "e" || h === "mail"
  )

  const name = lowerHeaders.filter(
    (h) =>
      h === "name" ||
      h === "candidate name" ||
      h === "candidate_name" ||
      h === "full name" ||
      h === "full_name" ||
      h === "candidate" ||
      h.includes("name")
  )

  const phone = lowerHeaders.filter(
    (h) =>
      h.includes("phone") ||
      h.includes("mobile") ||
      h === "tel" ||
      h === "telephone" ||
      h === "contact"
  )

  const headerSet = new Set(lowerHeaders)
  const used = new Set([...email, ...name, ...phone])
  const unknown = lowerHeaders.filter((h) => !used.has(h))

  return { email, name, phone, unknown }
}

/**
 * Build a canonical column mapping from raw headers to expected columns.
 * Headers are matched case-insensitively.
 *
 * Default mapping logic:
 * - Any header containing "email" (or "e" or "mail") -> "email"
 * - Any header matching name-like patterns -> "name"
 * - Any header containing "phone"/"mobile"/"tel"/"contact" -> "phone"
 *
 * Returns a map of: rawHeader -> canonicalColumn
 */
export function buildColumnMapping(
  headers: string[],
  customMapping?: Record<string, string>
): Record<string, string> {
  const mapping: Record<string, string> = {}

  if (customMapping) {
    return customMapping
  }

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
    }
  }

  return mapping
}

/**
 * Parse raw CSV text and return rows together with detected column mapping.
 */
export function parseCsv(
  csvText: string,
  columnMapping?: Record<string, string>
): ParseResult {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  const headers: string[] = result.meta.fields || []
  const mapping = columnMapping || buildColumnMapping(headers)

  // Find the actual column name for each expected field
  const emailCol = Object.entries(mapping).find(
    ([, v]) => v === "email"
  )?.[0]
  const nameCol = Object.entries(mapping).find(
    ([, v]) => v === "name"
  )?.[0]
  const phoneCol = Object.entries(mapping).find(
    ([, v]) => v === "phone"
  )?.[0]

  const rows: CsvInviteRow[] = []
  const invalidRows: RowValidation[] = []

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i] as Record<string, string>
    const rowNumber = i + 2 // +2 because 1-indexed + header row

    const email = (emailCol ? (row[emailCol] || "").trim() : "").toLowerCase()
    const name = nameCol ? (row[nameCol] || "").trim() || null : null
    const phone = phoneCol ? (row[phoneCol] || "").trim() || null : null

    const errors: string[] = []

    // Email is required
    if (!email) {
      errors.push("Email is required")
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push("Invalid email format")
    }

    // Validate phone if present
    if (phone && !PHONE_REGEX.test(phone)) {
      errors.push("Invalid phone number format")
    }

    if (errors.length > 0) {
      invalidRows.push({ rowNumber, email, name, phone, valid: false, errors })
    } else {
      rows.push({ rowNumber, email, name, phone })
    }
  }

  return {
    rows,
    validRows: rows,
    invalidRows,
    totalRows: rows.length + invalidRows.length,
    columnMapping: mapping,
  }
}

/**
 * Generate a unique invite code.
 */
export function generateInviteCode(): string {
  return crypto.randomUUID()
}

/**
 * Default expiry is 30 days from now.
 */
export function defaultExpiresAt(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date
}
