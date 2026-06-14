"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import {
  Calendar,
  Clock,
  Video,
  Globe,
  User,
  CheckCircle2,
  Ban,
  ArrowRight,
  FileText,
} from "lucide-react"
import {
  detectTimezone,
  formatInTimezoneHuman,
} from "@/lib/timezone/detect"

interface Interview {
  id: string
  scheduledAt: string
  duration: number
  timezone: string
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED"
  notes: string | null
  meetingLink: string | null
  candidate: {
    id: string
    name: string | null
    email: string
    status: string
    skillProfiles?: { scores: Record<string, number>; topSkills: string[] }[]
  }
  evaluator: { id: string; name: string | null; email: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
}

export default function EvaluatorDashboardPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [upcoming, setUpcoming] = useState<Interview[]>([])
  const [past, setPast] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [userTz, setUserTz] = useState("UTC")

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
      return
    }
    const detected = detectTimezone()
    setUserTz(detected)

    if (authStatus === "authenticated") {
      fetchInterviews()
    }
  }, [authStatus, router])

  async function fetchInterviews() {
    try {
      const res = await fetch("/api/admin/interviews/my")
      if (res.ok) {
        const data = await res.json()
        setUpcoming(data.upcoming || [])
        setPast(data.past || [])
      }
    } catch (err) {
      console.error("Failed to fetch interviews", err)
    } finally {
      setLoading(false)
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session?.user) return null

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          My Interviews
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your assigned interviews as an evaluator.
          {userTz !== "UTC" && (
            <span className="block text-xs mt-1">
              Times shown in your local timezone: <span className="font-medium">{userTz}</span>
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{past.filter((i) => i.status === "COMPLETED").length}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{past.filter((i) => i.status === "CANCELLED").length}</div>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Interviews */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Upcoming Interviews
          <Badge variant="outline" className="ml-1">{upcoming.length}</Badge>
        </h2>

        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No upcoming interviews assigned to you.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((iv) => (
              <Card key={iv.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={STATUS_CONFIG.SCHEDULED.color}>
                          {STATUS_CONFIG.SCHEDULED.label}
                        </Badge>
                        <span className="font-medium text-sm">
                          {iv.candidate.name || iv.candidate.email}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {iv.candidate.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{formatInTimezoneHuman(iv.scheduledAt, userTz)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{iv.duration} minutes</span>
                        <Globe className="h-3.5 w-3.5 ml-1" />
                        <span className="text-xs">{iv.timezone}</span>
                      </div>

                      {/* Skill summary */}
                      {iv.candidate.skillProfiles?.[0] && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>
                            Skills: {Object.entries(iv.candidate.skillProfiles[0].scores || {})
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 3)
                              .map(([k, v]) => `${k}: ${v}%`)
                              .join(", ")}
                          </span>
                        </div>
                      )}

                      {iv.notes && (
                        <p className="text-xs text-muted-foreground italic">{iv.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {iv.meetingLink ? (
                        <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="whitespace-nowrap w-full">
                            <Video className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="text-xs text-center">Link pending</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/interviews/${iv.id}/helper`)}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Start Scoring
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Interviews */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground flex items-center gap-2">
            Past Interviews
            <Badge variant="outline" className="ml-1">{past.length}</Badge>
          </h2>
          <div className="space-y-2">
            {past.map((iv) => {
              const config = STATUS_CONFIG[iv.status]
              return (
                <Card key={iv.id} className="opacity-70">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {iv.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Ban className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {iv.candidate.name || iv.candidate.email}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {formatInTimezoneHuman(iv.scheduledAt, userTz)}
                        </span>
                      </div>
                      <Badge className={config?.color || ""}>
                        {config?.label || iv.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
