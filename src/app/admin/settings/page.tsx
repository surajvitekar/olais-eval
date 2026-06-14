"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { Settings, Sliders } from "lucide-react"
import Link from "next/link"

interface CampaignConfig {
  maxParticipants: number
  deadline: string
  leaderboardPublic: boolean
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [config, setConfig] = useState<CampaignConfig>({
    maxParticipants: 100,
    deadline: "",
    leaderboardPublic: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchSettings()
    }
  }, [status, session, router])

  async function fetchSettings() {
    try {
      // Try to load from localStorage first, then from API
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setConfig({
            maxParticipants: data.config.maxParticipants ?? 100,
            deadline: data.config.deadline ? data.config.deadline.split("T")[0] : "",
            leaderboardPublic: data.config.leaderboardPublic ?? true,
          })
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save settings")
      }

      toast.success("Campaign settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <LoadingSpinner text="Loading settings..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Campaign Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure evaluation campaign parameters
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Configuration</CardTitle>
            <CardDescription>
              These settings control the evaluation campaign behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Maximum Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                max={10000}
                value={config.maxParticipants}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    maxParticipants: parseInt(e.target.value) || 100,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of candidates that can register
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="deadline">Campaign Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={config.deadline}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, deadline: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                After this date, no new submissions will be accepted
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="leaderboardPublic">Leaderboard Visibility</Label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      leaderboardPublic: true,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.leaderboardPublic
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Public
                </button>
                <button
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      leaderboardPublic: false,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !config.leaderboardPublic
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Private
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                When public, anyone can view the leaderboard without authentication
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>

        {/* Scoring Dimensions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              Scoring Dimensions
            </CardTitle>
            <CardDescription>
              Configure the dimensions evaluators use to score interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/settings/scoring">
              <Button variant="outline" className="w-full">
                Manage Scoring Dimensions
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for the campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="destructive"
              onClick={async () => {
                if (
                  !confirm(
                    "Are you sure you want to reset all leaderboard entries? This cannot be undone."
                  )
                )
                  return
                try {
                  const res = await fetch("/api/admin/leaderboard", {
                    method: "DELETE",
                  })
                  if (res.ok) {
                    toast.success("Leaderboard reset")
                  } else {
                    throw new Error("Failed to reset")
                  }
                } catch {
                  toast.error("Failed to reset leaderboard")
                }
              }}
            >
              Reset Leaderboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
