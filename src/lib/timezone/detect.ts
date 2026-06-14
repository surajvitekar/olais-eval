/**
 * ─── OLAIS EVAL — Timezone Detection Utility ─────────────────────────────────
 * Provides browser-based timezone detection, date formatting, conversion,
 * and a pre-built list of common timezones with UTC offsets.
 *
 * Uses Intl.DateTimeFormat and date-fns for reliable cross-browser support.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { formatInTimeZone } from "date-fns-tz"
import { format as dateFnsFormat } from "date-fns"

// ─── Timezone Detection ─────────────────────────────────────────────────────

/**
 * Detect the user's timezone from the browser using Intl.DateTimeFormat.
 * Falls back to "UTC" if detection fails (e.g., server-side rendering).
 */
export function detectTimezone(): string {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") {
    return "UTC"
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

// ─── Date Formatting ────────────────────────────────────────────────────────

/**
 * Format a date in a specific timezone.
 *
 * @param date - Date object or ISO string to format
 * @param tz - IANA timezone string (e.g., "America/New_York", "Asia/Kolkata")
 * @param fmt - date-fns format string (e.g., "PPpp", "yyyy-MM-dd HH:mm")
 * @returns Formatted date string in the target timezone
 */
export function formatInTimezone(
  date: Date | string | number,
  tz: string,
  fmt: string = "PPpp"
): string {
  try {
    return formatInTimeZone(date, tz, fmt)
  } catch {
    // Fallback: format without timezone conversion
    return dateFnsFormat(new Date(date), fmt)
  }
}

/**
 * Format a date in a specific timezone with a human-friendly representation.
 * Returns something like "May 31, 2026, 2:30 PM EDT"
 */
export function formatInTimezoneHuman(
  date: Date | string | number,
  tz: string
): string {
  try {
    const formatted = formatInTimeZone(date, tz, "PPpp")
    const tzAbbr = getTimezoneAbbreviation(tz)
    return tzAbbr ? `${formatted} ${tzAbbr}` : formatted
  } catch {
    return dateFnsFormat(new Date(date), "PPpp")
  }
}

/**
 * Get timezone abbreviation (e.g., "EST", "IST", "UTC") for a given IANA timezone.
 */
export function getTimezoneAbbreviation(tz: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "short",
    })
    const parts = formatter.formatToParts(now)
    const tzPart = parts.find((p) => p.type === "timeZoneName")
    return tzPart?.value ?? ""
  } catch {
    return ""
  }
}

// ─── Timezone Conversion ────────────────────────────────────────────────────

/**
 * Convert a date from one timezone to another.
 * Returns a Date object representing the same moment in the target timezone.
 *
 * @param date - Date object, ISO string, or timestamp
 * @param fromTz - Source IANA timezone
 * @param toTz - Target IANA timezone
 * @returns New Date object
 */
export function convertToTimezone(
  date: Date | string | number,
  fromTz: string,
  toTz: string
): Date {
  const d = new Date(date)
  // Format the date as an ISO string in the source timezone, then parse in target
  const sourceStr = formatInTimeZone(d, fromTz, "yyyy-MM-dd'T'HH:mm:ss")
  const targetStr = formatInTimeZone(
    new Date(`${sourceStr}Z`),
    toTz,
    "yyyy-MM-dd'T'HH:mm:ss"
  )
  return new Date(`${targetStr}Z`)
}

// ─── Timezone Options for UI Selectors ──────────────────────────────────────

export interface TimezoneOption {
  value: string   // IANA timezone string (e.g., "America/New_York")
  label: string   // Human label (e.g., "(GMT-5:00) America/New_York - EST")
  offset: string  // UTC offset (e.g., "-05:00")
  abbreviation: string // Short code (e.g., "EST")
}

/**
 * Get a formatted UTC offset string for a given timezone at the current date.
 */
export function getUtcOffset(tz: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "longOffset",
    })
    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find((p) => p.type === "timeZoneName")
    if (offsetPart?.value) {
      // Normalize "GMT+05:30" -> "+05:30", "GMT-05:00" -> "-05:00"
      const match = offsetPart.value.match(/([+-]\d{2}:\d{2})/)
      if (match) return match[1]
    }
    return "+00:00"
  } catch {
    return "+00:00"
  }
}

/**
 * Returns a sorted list of common timezones with UTC offsets and abbreviations.
 * Useful for populating timezone select/dropdown UI components.
 */
export function getTimezoneOptions(): TimezoneOption[] {
  const timezones = [
    "Pacific/Midway",
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Toronto",
    "America/Halifax",
    "America/St_Johns",
    "America/Sao_Paulo",
    "America/Argentina/Buenos_Aires",
    "Atlantic/Azores",
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Athens",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Perth",
    "Australia/Darwin",
    "Australia/Adelaide",
    "Australia/Sydney",
    "Pacific/Auckland",
    "Pacific/Fiji",
  ]

  return timezones
    .map((tz) => {
      const offset = getUtcOffset(tz)
      const abbr = getTimezoneAbbreviation(tz)
      const label = `(GMT${offset}) ${tz}${abbr ? ` - ${abbr}` : ""}`
      return { value: tz, label, offset, abbreviation: abbr }
    })
    .sort((a, b) => {
      // Sort by offset (ascending), then alphabetically
      const offsetCompare = a.offset.localeCompare(b.offset)
      if (offsetCompare !== 0) return offsetCompare
      return a.value.localeCompare(b.value)
    })
}
