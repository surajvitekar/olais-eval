"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import Link from "next/link"
import {
  Calendar,
  Clock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Video,
  User,
  AlertCircle,
  CheckCircle2,
  Ban,
  ArrowUpDown,
  Globe,
  Star,
} from "lucide-react"
import {
  detectTimezone,
  formatInTimezoneHuman,
  getTimezoneOptions,
} from "@/lib/timezone/detect"
import type { TimezoneOption } from "@/lib/timezone/detect"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// ── Types ───────────────────────────────────────────────────────────────────

interface Interview {
  id: string
  candidateId: string
  evaluatorId: string | null
  scheduledAt: string
  duration: number
  timezone: string
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED"
  notes: string | null
  meetingLink: string | null
  createdAt: string
  candidate: { id: string; name: string | null; email: string }
  evaluator: { id: string; name: string | null; email: string } | null
}

interface Candidate {
  id: string
  name: string | null
  email: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: <Calendar className="h-3 w-3" />,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: <Ban className="h-3 w-3" />,
  },
}

// ── Calendar Helpers ────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminInterviewsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [userTz, setUserTz] = useState("UTC")
  const [timezoneOptions, setTimezoneOptions] = useState<TimezoneOption[]>([])

  // Calendar state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())

  // Schedule form state
  const [showForm, setShowForm] = useState(false)
  const [formCandidate, setFormCandidate] = useState("")
  const [formEvaluator, setFormEvaluator] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formTime, setFormTime] = useState("")
  const [formDuration, setFormDuration] = useState("60")
  const [formTimezone, setFormTimezone] = useState("UTC")
  const [formNotes, setFormNotes] = useState("")
  const [formMeetingLink, setFormMeetingLink] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [evaluators, setEvaluators] = useState<Candidate[]>([])

  // Filter state
  const [statusFilter, setStatusFilter] = useState("")

  // Score form state
  const [scoreFormOpen, setScoreFormOpen] = useState(false)
  const [scoringInterview, setScoringInterview] = useState<Interview | null>(null)
  const [scoreProblemSolving, setScoreProblemSolving] = useState("")
  const [scoreTechSkills, setScoreTechSkills] = useState("")
  const [scoreCommunication, setScoreCommunication] = useState("")
  const [scoreCulturalFit, setScoreCulturalFit] = useState("")
  const [scoreNotes, setScoreNotes] = useState("")
  const [scoreError, setScoreError] = useState("")
  const [scoreSubmitting, setScoreSubmitting] = useState(false)

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
      return
    }
    if (authStatus === "authenticated" && session?.user?.role && !["ADMIN", "REVIEWER", "HIRING_MANAGER"].includes(session.user.role)) {
      router.push("/dashboard")
      return
    }

    // Detect timezone and load options
    const detected = detectTimezone()
    setUserTz(detected)
    setFormTimezone(detected)
    setTimezoneOptions(getTimezoneOptions())

    if (authStatus === "authenticated" && session?.user?.role && ["ADMIN", "REVIEWER", "HIRING_MANAGER"].includes(session.user.role)) {
      fetchInterviews()
      fetchCandidates()
      fetchEvaluators()
    }
  }, [authStatus, session, router])

  // ── Data Fetching ──────────────────────────────────────────────────────
  const fetchInterviews = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/admin/interviews?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInterviews(data.interviews || [])
      }
    } catch (err) {
      console.error("Failed to fetch interviews", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/candidates?limit=500")
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.candidates || [])
      }
    } catch (err) {
      console.error("Failed to fetch candidates", err)
    }
  }, [])

  const fetchEvaluators = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/candidates?role=ADMIN&role=REVIEWER&role=HIRING_MANAGER&limit=200")
      if (res.ok) {
        const data = await res.json()
        setEvaluators(data.candidates || [])
      }
    } catch (err) {
      console.error("Failed to fetch evaluators", err)
    }
  }, [])

  // ── Calendar Navigation ────────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
  }

  // ── Get interviews for a given day ─────────────────────────────────────
  const getInterviewsForDay = (year: number, month: number, day: number): Interview[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return interviews.filter((iv) => {
      const ivDate = new Date(iv.scheduledAt)
      const ivDateStr = `${ivDate.getFullYear()}-${String(ivDate.getMonth() + 1).padStart(2, "0")}-${String(ivDate.getDate()).padStart(2, "0")}`
      return ivDateStr === dateStr
    })
  }

  // ── Schedule Interview ─────────────────────────────────────────────────
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!formCandidate || !formDate || !formTime) {
      setFormError("Please fill in all required fields")
      return
    }

    // Validate timezone
    if (!formTimezone) {
      setFormError("Please select a timezone")
      return
    }

    setSubmitting(true)
    try {
      const scheduledAt = `${formDate}T${formTime}:00`

      const res = await fetch("/api/admin/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: formCandidate,
          evaluatorId: formEvaluator || undefined,
          scheduledAt,
          duration: parseInt(formDuration),
          timezone: formTimezone,
          notes: formNotes || undefined,
          meetingLink: formMeetingLink || undefined,
        }),
      })

      if (res.ok) {
        // Reset form
        setShowForm(false)
        setFormCandidate("")
        setFormEvaluator("")
        setFormDate("")
        setFormTime("")
        setFormDuration("60")
        setFormTimezone(userTz)
        setFormNotes("")
        setFormMeetingLink("")
        // Refresh
        fetchInterviews()
      } else {
        const data = await res.json()
        setFormError(data.error || "Failed to schedule interview")
      }
    } catch {
      setFormError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cancel Interview ───────────────────────────────────────────────────
  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this interview?")) return

    try {
      const res = await fetch(`/api/admin/interviews?id=${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchInterviews()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to cancel interview")
      }
    } catch {
      alert("Network error")
    }
  }

  // ── Open Score Form ─────────────────────────────────────────────────────
  const openScoreForm = (iv: Interview) => {
    setScoringInterview(iv)
    setScoreProblemSolving("")
    setScoreTechSkills("")
    setScoreCommunication("")
    setScoreCulturalFit("")
    setScoreNotes("")
    setScoreError("")
    setScoreFormOpen(true)
  }

  // ── Submit Scores ──────────────────────────────────────────────────────
  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault()
    setScoreError("")

    if (!scoringInterview) return

    // Validate at least one score
    if (!scoreProblemSolving && !scoreTechSkills && !scoreCommunication && !scoreCulturalFit) {
      setScoreError("Please provide at least one score")
      return
    }

    setScoreSubmitting(true)
    try {
      const body: Record<string, unknown> = {}
      if (scoreProblemSolving) body.problemSolving = parseInt(scoreProblemSolving)
      if (scoreTechSkills) body.techSkills = parseInt(scoreTechSkills)
      if (scoreCommunication) body.communication = parseInt(scoreCommunication)
      if (scoreCulturalFit) body.culturalFit = parseInt(scoreCulturalFit)
      if (scoreNotes) body.evaluatorNotes = scoreNotes

      const res = await fetch(`/api/admin/interviews/${scoringInterview.id}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setScoreFormOpen(false)
        setScoringInterview(null)
        fetchInterviews()
      } else {
        const data = await res.json()
        setScoreError(data.error || "Failed to submit scores")
      }
    } catch {
      setScoreError("Network error. Please try again.")
    } finally {
      setScoreSubmitting(false)
    }
  }

  // ── Filtered / upcoming interviews list ────────────────────────────────
  const upcomingInterviews = interviews
    .filter((iv) => iv.status === "SCHEDULED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const pastInterviews = interviews
    .filter((iv) => iv.status !== "SCHEDULED")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  // ── Loading / Auth Guard ───────────────────────────────────────────────
  if (authStatus === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (session?.user?.role !== "ADMIN") {
    return null
  }

  // ── Render Calendar Grid ───────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const calendarDays: (number | null)[] = []
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d)
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">
            Schedule and manage candidate interviews
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="mr-2 h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Schedule Interview
            </>
          )}
        </Button>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule New Interview
            </CardTitle>
            <CardDescription>
              Create an interview slot for a candidate. All times in your detected timezone (
              <span className="font-medium">{userTz}</span>).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Candidate */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Candidate *</label>
                  <Select value={formCandidate} onValueChange={(val) => val && setFormCandidate(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || c.email} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Evaluator (optional) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Evaluator (optional)</label>
                  <Select value={formEvaluator} onValueChange={(val) => val && setFormEvaluator(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Assign evaluator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {evaluators.length === 0 ? (
                        <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                          No evaluator accounts found. You will be the default evaluator.
                        </div>
                      ) : (
                        evaluators.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name || e.email} ({e.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Timezone *</label>
                  <Select value={formTimezone} onValueChange={(val) => val && setFormTimezone(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select timezone">
                        <Globe className="mr-1 h-3.5 w-3.5 inline" />
                        {formTimezone}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Time */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Time *</label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Select value={formDuration} onValueChange={(val) => val && setFormDuration(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[15, 30, 45, 60, 90, 120, 180].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Meeting Link */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Meeting Link</label>
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={formMeetingLink}
                    onChange={(e) => setFormMeetingLink(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
                  placeholder="Any notes or instructions for the interview..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Scheduling..." : "Schedule Interview"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Calendar + List Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Calendar
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </span>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-medium text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-card p-1 min-h-[80px]" />
                  }

                  const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  const isToday = dayStr === todayStr
                  const dayInterviews = getInterviewsForDay(currentYear, currentMonth, day)

                  return (
                    <div
                      key={day}
                      className={`bg-card p-1 min-h-[80px] hover:bg-muted/50 transition-colors ${
                        isToday ? "ring-1 ring-primary/40" : ""
                      }`}
                    >
                      <div
                        className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayInterviews.slice(0, 3).map((iv) => {
                          const ivTime = new Date(iv.scheduledAt)
                          const timeStr = ivTime.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          const config = STATUS_CONFIG[iv.status]
                          return (
                            <div
                              key={iv.id}
                              className={`text-[10px] leading-tight truncate rounded px-1 py-0.5 ${
                                iv.status === "CANCELLED"
                                  ? "line-through opacity-50"
                                  : ""
                              } ${config?.color || ""}`}
                              title={`${iv.candidate.name || iv.candidate.email} at ${timeStr} (${iv.duration}min)`}
                            >
                              {timeStr} {iv.candidate.name || iv.candidate.email}
                            </div>
                          )
                        })}
                        {dayInterviews.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayInterviews.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Upcoming + Past */}
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val ?? ""); setLoading(true); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Upcoming Interviews */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Upcoming ({upcomingInterviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {upcomingInterviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming interviews
                </p>
              ) : (
                upcomingInterviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="rounded-lg border p-3 space-y-1.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium truncate">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {iv.candidate.name || iv.candidate.email}
                      </div>
                      <Badge className={STATUS_CONFIG.SCHEDULED.color}>
                        {STATUS_CONFIG.SCHEDULED.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatInTimezoneHuman(iv.scheduledAt, iv.timezone)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {iv.duration} min
                      <Globe className="h-3 w-3 ml-1" />
                      {iv.timezone}
                    </div>
                    {iv.meetingLink && (
                      <a
                        href={iv.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Video className="h-3 w-3" />
                        Join Meeting
                      </a>
                    )}
                    <div className="flex justify-end gap-1 pt-1">
                      <Link
                        href={`/admin/interviews/${iv.id}/helper`}
                        className="inline-flex items-center justify-center rounded-md text-xs h-6 px-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Star className="h-3 w-3 mr-1" /> Score
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive h-6 px-2"
                        onClick={() => handleCancel(iv.id)}
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Past Interviews */}
          {pastInterviews.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  Past ({pastInterviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {pastInterviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="rounded-lg border p-3 space-y-1 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {iv.candidate.name || iv.candidate.email}
                      </span>
                      <Badge className={STATUS_CONFIG[iv.status]?.color || ""}>
                        {STATUS_CONFIG[iv.status]?.label || iv.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatInTimezoneHuman(iv.scheduledAt, iv.timezone)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>

      {/* Score Dialog */}
      <Dialog open={scoreFormOpen} onOpenChange={setScoreFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Interview Scores</DialogTitle>
            <DialogDescription>
              {scoringInterview && (
                <>Score {scoringInterview.candidate.name || scoringInterview.candidate.email}'s interview (0-100)</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitScore}>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="problemSolving">Problem Solving</Label>
                  <Input
                    id="problemSolving"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={scoreProblemSolving}
                    onChange={(e) => setScoreProblemSolving(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="techSkills">Tech Skills</Label>
                  <Input
                    id="techSkills"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={scoreTechSkills}
                    onChange={(e) => setScoreTechSkills(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="communication">Communication</Label>
                  <Input
                    id="communication"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={scoreCommunication}
                    onChange={(e) => setScoreCommunication(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="culturalFit">Cultural Fit</Label>
                  <Input
                    id="culturalFit"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={scoreCulturalFit}
                    onChange={(e) => setScoreCulturalFit(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scoreNotes">Evaluator Notes</Label>
                <textarea
                  id="scoreNotes"
                  className="h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
                  placeholder="Any notes about the interview..."
                  value={scoreNotes}
                  onChange={(e) => setScoreNotes(e.target.value)}
                />
              </div>
              {scoreError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {scoreError}
                </div>
              )}
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={scoreSubmitting}>
                {scoreSubmitting ? "Submitting..." : "Submit Scores"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
