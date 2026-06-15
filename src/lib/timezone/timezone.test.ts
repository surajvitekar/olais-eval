import { describe, it, expect } from "vitest"
import {
  detectTimezone,
  formatInTimezone,
  formatInTimezoneHuman,
  getTimezoneAbbreviation,
  getUtcOffset,
  convertToTimezone,
  getTimezoneOptions,
} from "./detect"

// ── detectTimezone ────────────────────────────────────────────────────────────

describe("detectTimezone", () => {
  it("returns a non-empty string", () => {
    const tz = detectTimezone()
    expect(typeof tz).toBe("string")
    expect(tz.length).toBeGreaterThan(0)
  })

  it("returns a valid IANA timezone accepted by Intl.DateTimeFormat", () => {
    const tz = detectTimezone()
    expect(() =>
      new Intl.DateTimeFormat("en", { timeZone: tz })
    ).not.toThrow()
  })

  it("returns UTC when Intl is unavailable", () => {
    // Temporarily hide Intl to exercise the fallback branch
    const savedIntl = globalThis.Intl
    Object.defineProperty(globalThis, "Intl", {
      value: undefined,
      writable: true,
      configurable: true,
    })
    try {
      const tz = detectTimezone()
      expect(tz).toBe("UTC")
    } finally {
      Object.defineProperty(globalThis, "Intl", {
        value: savedIntl,
        writable: true,
        configurable: true,
      })
    }
  })
})

// ── formatInTimezone ──────────────────────────────────────────────────────────

describe("formatInTimezone", () => {
  const refDate = new Date("2026-06-15T14:30:00Z")

  it("formats a Date in UTC with explicit format string", () => {
    const result = formatInTimezone(refDate, "UTC", "yyyy-MM-dd HH:mm")
    expect(result).toBe("2026-06-15 14:30")
  })

  it("formats a Date in Asia/Kolkata (UTC+5:30)", () => {
    const result = formatInTimezone(refDate, "Asia/Kolkata", "yyyy-MM-dd HH:mm")
    expect(result).toBe("2026-06-15 20:00")
  })

  it("formats a Date in America/New_York (EDT = UTC-4 in June)", () => {
    const result = formatInTimezone(refDate, "America/New_York", "yyyy-MM-dd HH:mm")
    expect(result).toBe("2026-06-15 10:30")
  })

  it("accepts an ISO string as input", () => {
    const result = formatInTimezone("2026-06-15T00:00:00Z", "UTC", "yyyy-MM-dd")
    expect(result).toBe("2026-06-15")
  })

  it("uses default format (PPpp) when no format string is provided", () => {
    const result = formatInTimezone(refDate, "UTC")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
    // PPpp produces something like "Jun 15, 2026, 2:30:00 PM"
    expect(result).toMatch(/2026/)
  })

  it("falls back gracefully for an invalid timezone", () => {
    // Should not throw — falls back to plain date-fns format
    const result = formatInTimezone(refDate, "Bad/Zone", "yyyy-MM-dd")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })
})

// ── formatInTimezoneHuman ─────────────────────────────────────────────────────

describe("formatInTimezoneHuman", () => {
  const refDate = new Date("2026-06-15T14:30:00Z")

  it("returns a human-readable string containing the year", () => {
    const result = formatInTimezoneHuman(refDate, "UTC")
    expect(typeof result).toBe("string")
    expect(result).toMatch(/2026/)
  })

  it("appends a timezone abbreviation when available", () => {
    const result = formatInTimezoneHuman(refDate, "America/New_York")
    // Should contain the abbreviation (EDT in June)
    expect(result).toMatch(/EDT/)
  })
})

// ── getTimezoneAbbreviation ───────────────────────────────────────────────────

describe("getTimezoneAbbreviation", () => {
  it("returns a non-empty string for UTC", () => {
    const abbr = getTimezoneAbbreviation("UTC")
    expect(typeof abbr).toBe("string")
    expect(abbr.length).toBeGreaterThan(0)
  })

  it("returns a non-empty string for America/New_York", () => {
    const abbr = getTimezoneAbbreviation("America/New_York")
    expect(typeof abbr).toBe("string")
    expect(abbr.length).toBeGreaterThan(0)
  })

  it("returns an empty string for an invalid timezone", () => {
    const abbr = getTimezoneAbbreviation("Invalid/Timezone")
    expect(abbr).toBe("")
  })
})

// ── getUtcOffset ──────────────────────────────────────────────────────────────

describe("getUtcOffset", () => {
  it("returns +00:00 for UTC", () => {
    const offset = getUtcOffset("UTC")
    expect(offset).toBe("+00:00")
  })

  it("returns a properly formatted offset string for Asia/Kolkata", () => {
    const offset = getUtcOffset("Asia/Kolkata")
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/)
    expect(offset).toBe("+05:30")
  })

  it("returns a properly formatted offset string for America/Los_Angeles", () => {
    const offset = getUtcOffset("America/Los_Angeles")
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/)
  })

  it("returns +00:00 as fallback for an invalid timezone", () => {
    const offset = getUtcOffset("Not/A/Timezone")
    expect(offset).toBe("+00:00")
  })
})

// ── convertToTimezone ─────────────────────────────────────────────────────────

describe("convertToTimezone", () => {
  it("returns a Date object", () => {
    const result = convertToTimezone(
      new Date("2026-06-15T12:00:00Z"),
      "UTC",
      "Asia/Kolkata"
    )
    expect(result).toBeInstanceOf(Date)
  })

  it("accepts a timestamp number as input", () => {
    const ts = Date.now()
    const result = convertToTimezone(ts, "UTC", "America/New_York")
    expect(result).toBeInstanceOf(Date)
  })
})

// ── getTimezoneOptions ────────────────────────────────────────────────────────

describe("getTimezoneOptions", () => {
  it("returns a non-empty array", () => {
    const options = getTimezoneOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })

  it("each option has value, label, offset, and abbreviation properties", () => {
    const options = getTimezoneOptions()
    for (const opt of options) {
      expect(opt).toHaveProperty("value")
      expect(opt).toHaveProperty("label")
      expect(opt).toHaveProperty("offset")
      expect(opt).toHaveProperty("abbreviation")
      expect(typeof opt.value).toBe("string")
      expect(typeof opt.label).toBe("string")
      expect(typeof opt.offset).toBe("string")
      expect(typeof opt.abbreviation).toBe("string")
    }
  })

  it("includes UTC in the list", () => {
    const options = getTimezoneOptions()
    const utcOpt = options.find((o) => o.value === "UTC")
    expect(utcOpt).toBeDefined()
    expect(utcOpt?.offset).toBe("+00:00")
  })

  it("includes Asia/Kolkata", () => {
    const options = getTimezoneOptions()
    const kolkata = options.find((o) => o.value === "Asia/Kolkata")
    expect(kolkata).toBeDefined()
    expect(kolkata?.offset).toBe("+05:30")
  })

  it("option labels include the IANA timezone name", () => {
    const options = getTimezoneOptions()
    for (const opt of options) {
      expect(opt.label).toContain(opt.value)
    }
  })

  it("options are sorted by UTC offset ascending", () => {
    const options = getTimezoneOptions()
    const offsets = options.map((o) => o.offset)
    const sorted = [...offsets].sort((a, b) => a.localeCompare(b))
    expect(offsets).toEqual(sorted)
  })

  it("returns all 34 configured timezones", () => {
    const options = getTimezoneOptions()
    expect(options).toHaveLength(34)
  })
})
