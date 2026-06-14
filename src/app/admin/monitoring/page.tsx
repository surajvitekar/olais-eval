"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { toast } from "sonner"
import {
  Activity,
  Server,
  Database,
  Container,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  BarChart3,
  ToggleLeft,
  Trash2,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface HistogramBucket {
  fromMs: number
  toMs: number
  count: number
}

interface RequestCount {
  path: string
  method: string
  status: number
  count: number
}

interface MetricsData {
  requestCounts: RequestCount[]
  responseTimeHistogram: HistogramBucket[]
  activeUsers: number
  totalRequests: number
  errorCount: number
  errorRate: number
  avgResponseTime: number
  uptimeSeconds: number
  collectedAt: number
  windowStart: number
}

interface HealthChecks {
  status: "healthy" | "degraded"
  uptime: number
  timestamp: string
  checks: Record<string, { status: "ok" | "error"; message: string }>
}

interface RecentError {
  path: string
  method: string
  status: number
  timestamp: number
  durationMs: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(" ")
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET": return "text-emerald-400"
    case "POST": return "text-blue-400"
    case "PUT": return "text-amber-400"
    case "DELETE": return "text-red-400"
    case "PATCH": return "text-purple-400"
    default: return "text-muted-foreground"
  }
}

function statusBadge(status: number): React.ReactNode {
  if (status < 300) {
    return <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">{status}</Badge>
  }
  if (status < 400) {
    return <Badge className="bg-amber-500/20 text-amber-400 text-xs">{status}</Badge>
  }
  return <Badge className="bg-red-500/20 text-red-400 text-xs">{status}</Badge>
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AdminMonitoringPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [health, setHealth] = useState<HealthChecks | null>(null)
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Initial data load
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
      return
    }
    if (authStatus === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    if (authStatus === "authenticated") {
      fetchAll()
    }
  }, [authStatus, session, router])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchAll(true)
    }, 10_000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  async function fetchAll(silent = false) {
    if (!silent) setLoading(true)
    try {
      const [metricsRes, healthRes, errorsRes] = await Promise.all([
        fetch("/api/admin/monitoring?include_errors=true"),
        fetch("/api/admin/monitoring/health"),
        fetch("/api/admin/monitoring?include_errors=true"),
      ])

      if (!metricsRes.ok) throw new Error("Failed to fetch metrics")
      if (!healthRes.ok) throw new Error("Failed to fetch health")

      const metricsJson = await metricsRes.json()
      const healthJson = await healthRes.json()
      const errorsJson = metricsJson

      setMetrics(metricsJson.metrics)
      setHealth(healthJson)
      setRecentErrors(errorsJson.recentErrors || [])
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof Error ? err.message : "Failed to load monitoring data")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResetMetrics() {
    setActionLoading("reset")
    try {
      const res = await fetch("/api/admin/monitoring", { method: "DELETE" })
      if (!res.ok) throw new Error("Reset failed")
      toast.success("Metrics counters reset")
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setActionLoading(null)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <LoadingSpinner text="Loading monitoring data..." />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoring</h1>
          <p className="mt-1 text-muted-foreground">
            System metrics, health checks, and request observability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "border-primary text-primary" : ""}
          >
            <ToggleLeft className={`mr-2 h-4 w-4 ${autoRefresh ? "rotate-90" : ""}`} />
            {autoRefresh ? "Auto-refresh On" : "Auto-refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchAll()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleResetMetrics}
            disabled={actionLoading !== null}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Reset Metrics
          </Button>
        </div>
      </div>

      {/* ── System Status Cards ────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">API Status</p>
                <p className="text-lg font-bold mt-1">
                  {health
                    ? health.status === "healthy"
                      ? "Healthy"
                      : "Degraded"
                    : "Unknown"}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${
                health?.status === "healthy"
                  ? "bg-emerald-500/20"
                  : "bg-red-500/20"
              }`}>
                <Server className={`h-6 w-6 ${
                  health?.status === "healthy"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Database</p>
                <p className="text-lg font-bold mt-1">
                  {health?.checks?.database?.status === "ok" ? "Connected" : "Error"}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${
                health?.checks?.database?.status === "ok"
                  ? "bg-emerald-500/20"
                  : "bg-red-500/20"
              }`}>
                <Database className={`h-6 w-6 ${
                  health?.checks?.database?.status === "ok"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Docker Sandbox</p>
                <p className="text-lg font-bold mt-1">
                  {health?.checks?.docker?.status === "ok" ? "Available" : "Unavailable"}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${
                health?.checks?.docker?.status === "ok"
                  ? "bg-emerald-500/20"
                  : "bg-amber-500/20"
              }`}>
                <Container className={`h-6 w-6 ${
                  health?.checks?.docker?.status === "ok"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                <p className="text-lg font-bold mt-1">
                  {metrics ? formatUptime(metrics.uptimeSeconds) : "---"}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-blue-500/20">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Request Metrics Cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold mt-1">{metrics?.totalRequests ?? 0}</p>
              </div>
              <div className="rounded-xl p-3 bg-indigo-500/20">
                <Activity className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold mt-1">
                  {metrics ? formatDuration(metrics.avgResponseTime) : "---"}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-purple-500/20">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold mt-1">
                  {metrics ? formatPercent(metrics.errorRate) : "---"}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${
                metrics && metrics.errorRate > 0.05
                  ? "bg-red-500/20"
                  : "bg-emerald-500/20"
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  metrics && metrics.errorRate > 0.05
                    ? "text-red-400"
                    : "text-emerald-400"
                }`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.errorCount ?? 0} errors total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold mt-1">{metrics?.activeUsers ?? 0}</p>
              </div>
              <div className="rounded-xl p-3 bg-cyan-500/20">
                <Users className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 15 minutes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* ── Response Time Distribution ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Response Time Distribution</CardTitle>
            </div>
            <CardDescription>
              Histogram of API response times in the current window
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && metrics.responseTimeHistogram.length > 0 ? (
              <div className="space-y-2">
                {metrics.responseTimeHistogram.map((bucket, index) => {
                  const maxCount = Math.max(
                    ...metrics.responseTimeHistogram.map((b) => b.count),
                    1,
                  )
                  const pct = (bucket.count / maxCount) * 100
                  const label =
                    bucket.toMs === -1
                      ? `≥${bucket.fromMs}ms`
                      : `${bucket.fromMs}–${bucket.toMs}ms`
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-24 text-right text-muted-foreground shrink-0">
                        {label}
                      </span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, bucket.count > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-10 text-right text-muted-foreground shrink-0">
                        {bucket.count}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No request data collected yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Health Check Details ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Health Check Details</CardTitle>
            </div>
            <CardDescription>
              Individual system component status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="space-y-3">
                {Object.entries(health.checks).map(([name, check]) => (
                  <div
                    key={name}
                    className="flex items-start justify-between rounded-lg border border-border/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {name.replace(/([A-Z])/g, " $1").trim()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {check.message}
                      </p>
                    </div>
                    <Badge
                      className={`shrink-0 ml-2 ${
                        check.status === "ok"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {check.status === "ok" ? "OK" : "ERROR"}
                    </Badge>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Checked at</span>
                  <span>{new Date(health.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Health check data unavailable
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Request Counts by Route ────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Request Counts by Route</CardTitle>
          </div>
          <CardDescription>
            Total requests per endpoint in the current metrics window
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics && metrics.requestCounts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.requestCounts
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 50)
                    .map((rc, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className={`font-mono text-xs font-medium ${methodColor(rc.method)}`}>
                            {rc.method}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-md truncate">
                          {rc.path}
                        </TableCell>
                        <TableCell>{statusBadge(rc.status)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {rc.count}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No request data collected yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Errors ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <CardTitle>Recent Errors</CardTitle>
          </div>
          <CardDescription>
            Last {recentErrors.length} requests with status &ge;400
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentErrors.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentErrors.slice(0, 30).map((err, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(err.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs font-medium ${methodColor(err.method)}`}>
                          {err.method}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-sm truncate">
                        {err.path}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          {err.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatDuration(err.durationMs)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-40" />
              No errors recorded in the current window
            </div>
          )}
        </CardContent>
        {recentErrors.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing up to 30 most recent errors
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
