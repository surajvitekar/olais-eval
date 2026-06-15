import { describe, it, expect } from "vitest"
import {
  parseCsv,
  detectColumns,
  buildColumnMapping,
  generateInviteCode,
  defaultExpiresAt,
} from "./parser"

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe("parseCsv", () => {
  it("parses a valid CSV row into an invite object with name and phone", () => {
    const csv = `email,name,phone\njohn@example.com,John Doe,+1234567890`
    const result = parseCsv(csv)

    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]).toMatchObject({
      email: "john@example.com",
      name: "John Doe",
      phone: "+1234567890",
      rowNumber: 2,
    })
    expect(result.invalidRows).toHaveLength(0)
  })

  it("sets name and phone to null when those columns are absent", () => {
    const csv = `email\njane@example.com`
    const result = parseCsv(csv)

    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0].name).toBeNull()
    expect(result.validRows[0].phone).toBeNull()
  })

  it("rejects a row with missing email — adds it to invalidRows with correct error", () => {
    const csv = `email,name\n,John Doe`
    const result = parseCsv(csv)

    expect(result.validRows).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0].errors).toContain("Email is required")
    expect(result.invalidRows[0].valid).toBe(false)
  })

  it("rejects a row with an invalid email format", () => {
    const csv = `email,name\nnot-an-email,John Doe`
    const result = parseCsv(csv)

    expect(result.validRows).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0].errors).toContain("Invalid email format")
  })

  it("rejects a row with an invalid phone number format", () => {
    const csv = `email,phone\nvalid@example.com,abc-invalid`
    const result = parseCsv(csv)

    expect(result.validRows).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0].errors).toContain("Invalid phone number format")
  })

  it("collects errors across multiple malformed rows without crashing", () => {
    const csv = `email,name\nnot-valid,Alice\n,Bob\nbad@@format.com,Carol`
    const result = parseCsv(csv)

    expect(result.invalidRows).toHaveLength(3)
    expect(result.validRows).toHaveLength(0)
    expect(result.totalRows).toBe(3)
    for (const row of result.invalidRows) {
      expect(row.errors.length).toBeGreaterThan(0)
      expect(row.valid).toBe(false)
    }
  })

  it("normalises email to lowercase", () => {
    const csv = `email\nJOHN@EXAMPLE.COM`
    const result = parseCsv(csv)

    expect(result.validRows[0].email).toBe("john@example.com")
  })

  it("assigns rowNumber starting at 2 to account for the header row", () => {
    const csv = `email\nfirst@example.com\nsecond@example.com`
    const result = parseCsv(csv)

    expect(result.validRows[0].rowNumber).toBe(2)
    expect(result.validRows[1].rowNumber).toBe(3)
  })

  it("returns correct totals when mix of valid and invalid rows present", () => {
    const csv = `email\ngood@example.com\nbad-email`
    const result = parseCsv(csv)

    expect(result.totalRows).toBe(2)
    expect(result.validRows).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(1)
  })

  it("accepts a custom column mapping and maps exotic headers correctly", () => {
    const csv = `correo,nombre\nalice@example.com,Alice`
    const customMapping = { correo: "email", nombre: "name" }
    const result = parseCsv(csv, customMapping)

    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0].email).toBe("alice@example.com")
    expect(result.validRows[0].name).toBe("Alice")
  })

  it("returns the resolved columnMapping in the ParseResult", () => {
    const csv = `email,name\ntest@example.com,Test`
    const result = parseCsv(csv)

    expect(result.columnMapping).toHaveProperty("email")
    expect(result.columnMapping["email"]).toBe("email")
  })

  // Note: The parser does NOT support per-row expiresAt in CSV data —
  // expiry is applied globally via defaultExpiresAt() when creating invites.
  // There is also no JSON input mode; only CSV text is accepted by parseCsv().
})

// ---------------------------------------------------------------------------
// detectColumns
// ---------------------------------------------------------------------------

describe("detectColumns", () => {
  it("detects email column when header contains 'email'", () => {
    const result = detectColumns(["Email Address", "Full Name", "Phone"])
    expect(result.email).toContain("email address")
  })

  it("detects name column when header contains 'name'", () => {
    const result = detectColumns(["email", "candidate_name"])
    expect(result.name).toContain("candidate_name")
  })

  it("detects phone column when header contains 'phone'", () => {
    const result = detectColumns(["email", "mobile_phone"])
    expect(result.phone).toContain("mobile_phone")
  })

  it("detects phone column when header is 'mobile'", () => {
    const result = detectColumns(["email", "mobile"])
    expect(result.phone).toContain("mobile")
  })

  it("places unrecognised headers in the unknown bucket", () => {
    const result = detectColumns(["email", "company", "location"])
    expect(result.unknown).toContain("company")
    expect(result.unknown).toContain("location")
  })

  it("handles an empty headers array without throwing", () => {
    const result = detectColumns([])
    expect(result.email).toHaveLength(0)
    expect(result.name).toHaveLength(0)
    expect(result.phone).toHaveLength(0)
    expect(result.unknown).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// buildColumnMapping
// ---------------------------------------------------------------------------

describe("buildColumnMapping", () => {
  it("maps an email-like header to the canonical 'email' key", () => {
    const mapping = buildColumnMapping(["Email Address", "Full Name"])
    expect(mapping["Email Address"]).toBe("email")
  })

  it("maps a name-like header to the canonical 'name' key", () => {
    const mapping = buildColumnMapping(["email", "candidate_name"])
    expect(mapping["candidate_name"]).toBe("name")
  })

  it("maps a phone-like header to the canonical 'phone' key", () => {
    const mapping = buildColumnMapping(["email", "phone_number"])
    expect(mapping["phone_number"]).toBe("phone")
  })

  it("returns customMapping verbatim when provided, skipping auto-detection", () => {
    const custom = { correo: "email", nombre: "name" }
    const mapping = buildColumnMapping(["correo", "nombre"], custom)
    expect(mapping).toEqual(custom)
  })

  it("does not include unrecognised headers in the mapping", () => {
    const mapping = buildColumnMapping(["email", "company"])
    expect(mapping["company"]).toBeUndefined()
  })

  it("handles case-insensitive header matching", () => {
    const mapping = buildColumnMapping(["EMAIL", "NAME"])
    expect(mapping["EMAIL"]).toBe("email")
    expect(mapping["NAME"]).toBe("name")
  })
})

// ---------------------------------------------------------------------------
// generateInviteCode
// ---------------------------------------------------------------------------

describe("generateInviteCode", () => {
  it("returns a non-empty string", () => {
    const code = generateInviteCode()
    expect(typeof code).toBe("string")
    expect(code.length).toBeGreaterThan(0)
  })

  it("returns a string in UUID format", () => {
    const code = generateInviteCode()
    expect(code).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it("returns a unique code on every call", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()))
    expect(codes.size).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// defaultExpiresAt
// ---------------------------------------------------------------------------

describe("defaultExpiresAt", () => {
  it("returns a Date instance in the future", () => {
    const expiry = defaultExpiresAt()
    expect(expiry).toBeInstanceOf(Date)
    expect(expiry.getTime()).toBeGreaterThan(Date.now())
  })

  it("returns a date approximately 30 days from now", () => {
    const before = Date.now()
    const expiry = defaultExpiresAt()
    const diffMs = expiry.getTime() - before
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    // Allow 0.5 days of tolerance to avoid flaky tests
    expect(diffDays).toBeGreaterThanOrEqual(29.5)
    expect(diffDays).toBeLessThanOrEqual(30.5)
  })
})
