"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { WEBHOOK_EVENTS } from "@/types"
import {
  Plus,
  Trash2,
  TestTube,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react"

const ALL_EVENTS = [
  { value: WEBHOOK_EVENTS.CANDIDATE_REGISTERED, label: "Candidate Registered" },
  { value: WEBHOOK_EVENTS.ASSESSMENT_COMPLETED, label: "Assessment Completed" },
  { value: WEBHOOK_EVENTS.SUBMISSION_SUBMITTED, label: "Submission Submitted" },
  { value: WEBHOOK_EVENTS.EVALUATION_COMPLETED, label: "Evaluation Completed" },
]

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  secret: string
  events: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  webhookEvents?: WebhookEventItem[]
}

interface WebhookEventItem {
  id: string
  event: string
  status: string
  responseCode: number | null
  attempts: number
  createdAt: string
  deliveredAt: string | null
}

export default function AdminWebhooksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  // Add form
  const [newName, setNewName] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Edit form
  const [editEndpoint, setEditEndpoint] = useState<WebhookEndpoint | null>(null)
  const [editName, setEditName] = useState("")
  const [editUrl, setEditUrl] = useState("")
  const [editEvents, setEditEvents] = useState<string[]>([])
  const [editIsActive, setEditIsActive] = useState(true)
  const [editing, setEditing] = useState(false)

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/webhooks?includeEvents=true")
      if (res.ok) {
        const data = await res.json()
        setEndpoints(data.endpoints)
      }
    } catch (err) {
      console.error("Failed to fetch webhooks", err)
      toast.error("Failed to fetch webhook endpoints")
    } finally {
      setLoading(false)
    }
  }, [])

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
      fetchEndpoints()
    }
  }, [status, session, router, fetchEndpoints])

  async function handleCreate() {
    if (!newName.trim() || !newUrl.trim() || newEvents.length === 0) {
      toast.error("Please fill in all fields and select at least one event")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, url: newUrl, events: newEvents }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create webhook")
      }

      const data = await res.json()
      toast.success("Webhook created successfully")
      setShowAddDialog(false)
      setNewName("")
      setNewUrl("")
      setNewEvents([])

      // Show the secret once
      if (data.secret) {
        toast.success(
          `Secret: ${data.secret.substring(0, 16)}... (copy from edit)`,
          { duration: 6000 },
        )
      }

      fetchEndpoints()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create webhook")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editEndpoint) return

    setEditing(true)
    try {
      const res = await fetch(`/api/admin/webhooks/${editEndpoint.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          url: editUrl,
          events: editEvents,
          isActive: editIsActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update webhook")
      }

      toast.success("Webhook updated successfully")
      setShowEditDialog(false)
      setEditEndpoint(null)
      fetchEndpoints()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update webhook")
    } finally {
      setEditing(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this webhook endpoint?")) return

    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete webhook")
      }

      toast.success("Webhook deleted")
      fetchEndpoints()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete webhook")
    }
  }

  async function handleTest(id: string) {
    setTestingId(id)
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/test`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Test failed")
      }

      const data = await res.json()
      toast.success(`Test event sent, status: ${data.statusCode || "OK"}`)
      fetchEndpoints()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed")
    } finally {
      setTestingId(null)
    }
  }

  function toggleEvent(events: string[], event: string): string[] {
    if (events.includes(event)) {
      return events.filter((e) => e !== event)
    }
    return [...events, event]
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function openEdit(endpoint: WebhookEndpoint) {
    setEditEndpoint(endpoint)
    setEditName(endpoint.name)
    setEditUrl(endpoint.url)
    setEditEvents([...endpoint.events])
    setEditIsActive(endpoint.isActive)
    setShowEditDialog(true)
  }

  function getEventLabel(event: string): string {
    const found = ALL_EVENTS.find((e) => e.value === event)
    return found?.label || event
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "PENDING":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <LoadingSpinner text="Loading webhooks..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-muted-foreground">
            Manage outgoing webhook endpoints for real-time event notifications
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {endpoints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No webhooks configured</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a webhook endpoint to receive events from the platform
            </p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.id} className={endpoint.isActive ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                      <Badge variant={endpoint.isActive ? "default" : "secondary"}>
                        {endpoint.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-sm">
                      {endpoint.url}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(endpoint)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(endpoint.id)}
                      disabled={testingId === endpoint.id}
                    >
                      {testingId === endpoint.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowSecret((prev) => ({
                          ...prev,
                          [endpoint.id]: !prev[endpoint.id],
                        }))
                      }
                    >
                      {showSecret[endpoint.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(endpoint.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Secret */}
                  {showSecret[endpoint.id] && (
                    <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                      <code className="flex-1 text-xs break-all">
                        Secret: {endpoint.secret}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(endpoint.secret, endpoint.id)}
                      >
                        {copiedId === endpoint.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Events */}
                  <div className="flex flex-wrap gap-1.5">
                    {endpoint.events.map((event) => (
                      <Badge key={event} variant="outline">
                        {getEventLabel(event)}
                      </Badge>
                    ))}
                  </div>

                  {/* Recent events */}
                  {endpoint.webhookEvents && endpoint.webhookEvents.length > 0 && (
                    <div className="pt-2">
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Recent Events
                      </p>
                      <div className="space-y-1">
                        {endpoint.webhookEvents.slice(0, 5).map((evt) => (
                          <div
                            key={evt.id}
                            className="flex items-center gap-2 rounded-sm bg-muted/50 px-2 py-1"
                          >
                            {getStatusIcon(evt.status)}
                            <span className="text-xs font-medium">
                              {getEventLabel(evt.event)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {evt.status}
                            </span>
                            {evt.responseCode && (
                              <span className="text-xs text-muted-foreground">
                                ({evt.responseCode})
                              </span>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {evt.attempts} attempt{evt.attempts !== 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure a new webhook endpoint to receive events when actions occur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Slack Webhook"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Endpoint URL</Label>
              <Input
                id="url"
                placeholder="https://hooks.example.com/webhook"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <p className="text-xs text-muted-foreground">
                Select which events to subscribe to
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {ALL_EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={newEvents.includes(event.value)}
                      onChange={() => setNewEvents(toggleEvent(newEvents, event.value))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{event.label}</span>
                    <code className="ml-auto text-xs text-muted-foreground">
                      {event.value}
                    </code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Update the webhook endpoint configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">Endpoint URL</Label>
              <Input
                id="edit-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {ALL_EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={editEvents.includes(event.value)}
                      onChange={() => setEditEvents(toggleEvent(editEvents, event.value))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{event.label}</span>
                    <code className="ml-auto text-xs text-muted-foreground">
                      {event.value}
                    </code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-isActive" className="cursor-pointer">
                Endpoint is active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={editing}>
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
