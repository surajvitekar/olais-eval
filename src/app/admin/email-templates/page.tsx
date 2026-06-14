"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Loader2,
  Eye,
  X,
} from "lucide-react"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlBody: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const defaultTemplates = [
  {
    name: "invite",
    subject: "You're Invited to Olais Eval",
    htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f5f7;">
<div style="max-width:520px;margin:48px auto;background:#fff;border-radius:16px;padding:40px;text-align:center;">
<div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
<span style="color:#fff;font-size:24px;font-weight:700;">O</span>
</div>
<h1 style="color:#1a1a2e;font-size:24px;">You're Invited!</h1>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Dear {{candidateName}},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">We are pleased to invite you to participate in the Olais Eval assessment process.</p>
<p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;font-size:20px;font-weight:700;letter-spacing:3px;color:#4f46e5;">{{inviteCode}}</p>
<a href="{{registerUrl}}" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Register Now</a>
<p style="color:#94a3b8;font-size:13px;margin-top:24px;">Olais Eval</p>
</div>
</body>
</html>`,
    isActive: true,
  },
  {
    name: "assessment-assigned",
    subject: "Assessment Assigned — Olais Eval",
    htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f5f7;">
<div style="max-width:520px;margin:48px auto;background:#fff;border-radius:16px;padding:40px;text-align:center;">
<div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
<span style="color:#fff;font-size:24px;font-weight:700;">O</span>
</div>
<h1 style="color:#1a1a2e;font-size:24px;">Assessment Assigned</h1>
<p style="color:#64748b;font-size:15px;">Dear {{candidateName}},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">A new assessment has been assigned to you on Olais Eval.</p>
<p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;font-size:16px;font-weight:600;color:#1a1a2e;">{{problemTitle}}</p>
<p style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;color:#92400e;font-size:13px;">Please submit by {{deadline}}.</p>
<a href="{{dashboardUrl}}" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Go to Dashboard</a>
</div>
</body>
</html>`,
    isActive: true,
  },
  {
    name: "deadline-reminder",
    subject: "Deadline Reminder — Olais Eval",
    htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f5f7;">
<div style="max-width:520px;margin:48px auto;background:#fff;border-radius:16px;padding:40px;text-align:center;">
<h1 style="color:#1a1a2e;font-size:24px;">Deadline Reminder</h1>
<p style="color:#64748b;font-size:15px;">Dear {{candidateName}},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">This is a reminder that your assessment is due soon.</p>
<p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;font-size:16px;font-weight:600;color:#1a1a2e;">{{problemTitle}}</p>
<p style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;color:#92400e;font-size:13px;">Deadline: {{deadline}} — {{daysRemaining}} day(s) remaining.</p>
<a href="{{dashboardUrl}}" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Submit Now</a>
</div>
</body>
</html>`,
    isActive: true,
  },
  {
    name: "results-available",
    subject: "Your Results Are Ready — Olais Eval",
    htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f5f7;">
<div style="max-width:520px;margin:48px auto;background:#fff;border-radius:16px;padding:40px;text-align:center;">
<div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
<span style="color:#fff;font-size:24px;font-weight:700;">O</span>
</div>
<h1 style="color:#1a1a2e;font-size:24px;">Your Results Are Ready</h1>
<p style="color:#64748b;font-size:15px;">Dear {{candidateName}},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Your assessment results are now available.</p>
<p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
<span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your Score</span>
<span style="display:block;font-size:36px;font-weight:700;color:#4f46e5;">{{totalScore}}<span style="font-size:18px;color:#94a3b8;">/{{maxScore}}</span></span>
</p>
<a href="{{dashboardUrl}}" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">View Full Results</a>
</div>
</body>
</html>`,
    isActive: true,
  },
]

export default function AdminEmailTemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [seedLoading, setSeedLoading] = useState(false)

  const [form, setForm] = useState({
    name: "",
    subject: "",
    htmlBody: "",
    isActive: true,
  })

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (err) {
      toast.error("Failed to load email templates")
      console.error(err)
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
      fetchTemplates()
    }
  }, [status, session, router, fetchTemplates])

  function openCreateDialog() {
    setEditing(null)
    setForm({ name: "", subject: "", htmlBody: "", isActive: true })
    setShowDialog(true)
  }

  function openEditDialog(template: EmailTemplate) {
    setEditing(template)
    setForm({
      name: template.name,
      subject: template.subject,
      htmlBody: template.htmlBody,
      isActive: template.isActive,
    })
    setShowDialog(true)
  }

  function openPreview(html: string) {
    setPreviewHtml(html)
    setShowPreview(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setSaving(true)
    try {
      const url = "/api/admin/email-templates"
      const method = editing ? "PUT" : "POST"
      const body = editing
        ? { id: editing.id, ...form }
        : form

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to save template")
      }

      toast.success(
        editing ? "Template updated successfully" : "Template created successfully"
      )
      setShowDialog(false)
      fetchTemplates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/email-templates?id=${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete template")
      }

      toast.success(`Template "${name}" deleted`)
      fetchTemplates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template")
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  async function handleSeedDefaults() {
    setSeedLoading(true)
    let created = 0
    let skipped = 0
    try {
      for (const tpl of defaultTemplates) {
        const exists = templates.find((t) => t.name === tpl.name)
        if (exists) {
          skipped++
          continue
        }
        const res = await fetch("/api/admin/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tpl),
        })
        if (res.ok) created++
      }
      toast.success(
        `Created ${created} template(s), ${skipped} already existed`
      )
      fetchTemplates()
    } catch (err) {
      toast.error("Failed to seed default templates")
      console.error(err)
    } finally {
      setSeedLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading email templates..." />
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Email Templates
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage transactional email templates used throughout the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedDefaults}
            disabled={seedLoading}
            className="gap-2"
          >
            {seedLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Seed Defaults
          </Button>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Templates{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({templates.length})
            </span>
          </CardTitle>
          <CardDescription>
            Templates use <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{{variable}}`}</code>{" "}
            placeholders that are replaced at send time. Supported variables
            depend on the template type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                No email templates yet. Click &quot;Seed Defaults&quot; to
                populate, or create one manually.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium font-mono text-sm">
                      {tpl.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {tpl.subject}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tpl.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {tpl.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(tpl.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPreview(tpl.htmlBody)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(tpl)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tpl.id, tpl.name)}
                          disabled={deleting === tpl.id}
                          title="Delete"
                        >
                          {deleting === tpl.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the email template below."
                : "Fill in the details to create a new email template."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g. welcome-email"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier used in code (e.g. &quot;invite&quot;,
                &quot;results-available&quot;).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                placeholder="You're Invited to Olais Eval"
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="htmlBody">HTML Body</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openPreview(form.htmlBody)}
                  className="gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
              </div>
              <textarea
                id="htmlBody"
                rows={16}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder='<!DOCTYPE html>...'
                value={form.htmlBody}
                onChange={(e) =>
                  setForm((f) => ({ ...f, htmlBody: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isActive" className="text-sm font-normal">
                Active (template will be used for sending)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              This is how the template will render in email clients.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={previewHtml}
              title="Email Preview"
              className="w-full"
              style={{ minHeight: "400px", border: "none" }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
