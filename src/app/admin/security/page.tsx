"use client"

import { useState, useEffect } from "react"
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
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import {
  Shield,
  Activity,
  RefreshCw,
  Lock,
  FileText,
  Globe,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface RateLimitConfig {
  limit: number
  windowMs: number
}

interface SecurityStatus {
  rateLimits: {
    configs: Record<string, RateLimitConfig>
    storeSize: number
    checkKeys: Array<{
      key: string
      config: RateLimitConfig
      current: number
      remaining: number
    }>
  }
  headers: {
    csp: string
    hsts: string
    xfo: string
    contentType: string
    referrerPolicy: string
    permissionsPolicy: string
  }
}

interface SecurityData {
  status: SecurityStatus
  configured: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatWindow(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${ms / 1000}s`
  return `${ms / 60_000}m`
}

function getBadgeClass(value: boolean | string): string {
  if (value === true || value === "enabled") return "bg-emerald-500/20 text-emerald-400"
  if (value === false || value === "disabled" || value === "DENY") return "bg-emerald-500/20 text-emerald-400"
  return "bg-amber-500/20 text-amber-400"
}

function msToSeconds(ms: number): number {
  return Math.floor(ms / 1000)
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AdminSecurityPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SecurityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [checkKey, setCheckKey] = useState("")
  const [checkResult, setCheckResult] = useState<{
    key: string
    current: number
    remaining: number
    limit: number
  } | null>(null)

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
      fetchSecurityStatus()
    }
  }, [authStatus, session, router])

  async function fetchSecurityStatus() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/security")
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to fetch security status")
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security settings")
      toast.error(err instanceof Error ? err.message : "Failed to load security settings")
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(action: string, body?: Record<string, unknown>) {
    setActionLoading(action)
    try {
      const res = await fetch("/api/admin/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Action failed")
      }
      const result = await res.json()
      toast.success(result.message || "Action completed")
      // Refresh status
      fetchSecurityStatus()
      return result
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
      return null
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCheckKey() {
    if (!checkKey.trim()) {
      toast.error("Enter a rate limit key to check")
      return
    }
    setActionLoading("check")
    try {
      const res = await fetch("/api/admin/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_key", key: checkKey.trim() }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Check failed")
      }
      const result = await res.json()
      setCheckResult({
        key: result.key,
        current: result.current,
        remaining: result.remaining,
        limit: result.limit,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check failed")
    } finally {
      setActionLoading(null)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <LoadingSpinner text="Loading security settings..." />
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Security</h1>
          <p className="mt-1 text-muted-foreground">
            Rate limiting, security headers, and audit configuration
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error || "No data available"}</p>
            <Button onClick={fetchSecurityStatus} variant="outline" className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { status } = data

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security</h1>
          <p className="mt-1 text-muted-foreground">
            Rate limiting, security headers, and audit configuration
          </p>
        </div>
        <Button variant="outline" onClick={fetchSecurityStatus} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* ── Rate Limit Configs ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Rate Limiting</CardTitle>
            </div>
            <CardDescription>
              Sliding window rate limits by route category. Active keys in store:{" "}
              <span className="font-mono font-bold">{status.rateLimits.storeSize}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium">Category</th>
                    <th className="text-right py-2 px-3 font-medium">Limit</th>
                    <th className="text-right py-2 px-3 font-medium">Window</th>
                    <th className="text-right py-2 px-3 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(status.rateLimits.configs).map(([key, config]) => (
                    <tr key={key} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-mono text-sm">{key}</td>
                      <td className="py-2 px-3 text-right font-mono">{config.limit}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatWindow(config.windowMs)}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {config.limit}/{formatWindow(config.windowMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction("reset_all_rate_limits")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "reset_all_rate_limits" ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reset All Rate Limits
            </Button>
          </CardFooter>
        </Card>

        {/* ── Rate Limit Key Check ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Rate Limit Key Inspector</CardTitle>
            </div>
            <CardDescription>
              Check current usage for a specific rate limit key (e.g. &quot;ip:1.2.3.4&quot; or &quot;user:abc123&quot;)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="check-key">Rate Limit Key</Label>
                <Input
                  id="check-key"
                  placeholder="ip:127.0.0.1"
                  value={checkKey}
                  onChange={(e) => setCheckKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckKey()}
                />
              </div>
              <Button
                onClick={handleCheckKey}
                disabled={actionLoading !== null || !checkKey.trim()}
              >
                {actionLoading === "check" ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Check
              </Button>
            </div>

            {checkResult && (
              <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Key:</span>
                  <span className="font-mono text-sm">{checkResult.key}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current:</span>
                  <span className="font-mono text-sm">{checkResult.current}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Limit:</span>
                  <span className="font-mono text-sm">{checkResult.limit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Remaining:</span>
                  <span className={`font-mono text-sm ${
                    checkResult.remaining === 0 ? "text-red-400" : "text-emerald-400"
                  }`}>
                    {checkResult.remaining}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Security Headers ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Security Headers</CardTitle>
            </div>
            <CardDescription>
              HTTP security headers applied to all responses via proxy.ts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium">Header</th>
                    <th className="text-left py-2 px-3 font-medium">Value</th>
                    <th className="text-center py-2 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">Content-Security-Policy</td>
                    <td className="py-2 px-3 font-mono text-xs max-w-md truncate" title={status.headers.csp}>
                      {status.headers.csp.substring(0, 60)}...
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">Strict-Transport-Security</td>
                    <td className="py-2 px-3 font-mono text-xs">{status.headers.hsts}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(status.headers.hsts !== "disabled (dev mode)")}`}>
                        {status.headers.hsts === "disabled (dev mode)" ? "Dev Mode" : "Active"}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">X-Frame-Options</td>
                    <td className="py-2 px-3 font-mono text-xs">{status.headers.xfo}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">X-Content-Type-Options</td>
                    <td className="py-2 px-3 font-mono text-xs">{status.headers.contentType}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">Referrer-Policy</td>
                    <td className="py-2 px-3 font-mono text-xs">{status.headers.referrerPolicy}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">Permissions-Policy</td>
                    <td className="py-2 px-3 font-mono text-xs">{status.headers.permissionsPolicy}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Audit Logging Info ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Audit Logging</CardTitle>
            </div>
            <CardDescription>
              API requests are logged to the <code className="text-xs bg-muted px-1 py-0.5 rounded">AuditLog</code> table in PostgreSQL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>
                  Every <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/*</code> request passing through
                  proxy.ts is logged with IP, user agent, path, method, and query params.
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>
                  Rate limit exceedances are logged with the client key and category.
                </span>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Audit logs are written asynchronously (fire-and-forget) and will never
                block or crash a request.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Management ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Security Management</CardTitle>
            </div>
            <CardDescription>
              Actions to manage the security subsystem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("reset_all_rate_limits")}
              disabled={actionLoading !== null}
              className="w-full sm:w-auto"
            >
              {actionLoading === "reset_all_rate_limits" ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reset All Rate Limit Counters
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
