"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY_PREFIX = "olais-timer-"

/**
 * Timer component that shows elapsed time in HH:MM:SS format.
 * Persists in localStorage so it survives page refreshes.
 * Props: assignedProblemId (used as localStorage key)
 */
export default function Timer() {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    // Try to restore from localStorage
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + "start")
    if (stored) {
      const startTime = parseInt(stored, 10)
      if (!isNaN(startTime)) {
        const now = Date.now()
        setElapsed(Math.floor((now - startTime) / 1000))
      }
    } else {
      // Start new timer
      localStorage.setItem(STORAGE_KEY_PREFIX + "start", String(Date.now()))
    }

    // Update every second
    const interval = setInterval(() => {
      const start = localStorage.getItem(STORAGE_KEY_PREFIX + "start")
      if (start) {
        const now = Date.now()
        setElapsed(Math.floor((now - parseInt(start, 10)) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const timeStr = [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":")

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 font-mono text-sm">
      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      <span className="tabular-nums">{timeStr}</span>
    </div>
  )
}

/**
 * Get elapsed seconds from localStorage for submission.
 */
export function getElapsedSeconds(): number {
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + "start")
  if (stored) {
    return Math.floor((Date.now() - parseInt(stored, 10)) / 1000)
  }
  return 0
}

/**
 * Clear the timer from localStorage.
 */
export function clearTimer() {
  localStorage.removeItem(STORAGE_KEY_PREFIX + "start")
}
