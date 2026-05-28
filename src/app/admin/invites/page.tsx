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
} from "@/components/ui/card"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Mail, Plus, X, Send, Copy, Check } from "lucide-react"

interface Invite {
  id: string
  code: string
  candidateName?: string | null
  candidateEmail?: string | null
  maxUses: number
  usedCount: number
  expiresAt: string
  createdAt: string
  sentAt?: string | null
  creator: {
    name: string | null
    email: string
  }
}

interface CreateResult {
  code: string
  candidateName?: string
  candidateEmail: string
  emailStatus: "sent" | "failed" | "skipped"
  emailError?: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

export default function AdminInvitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Create mode: "individual" (with email) or "batch" (generic codes)
  const [createMode, setCreateMode] = useState<"individual" | "batch">("individual")

  // Individual invite fields
  const [candidateName, setCandidateName] = useState("")
  const [candidateEmail, setCandidateEmail] = useState("")

  // Batch invite fields
  const [batchCount, setBatchCount] = useState(1)

  // Common fields
  const [maxUses, setMaxUses] = useState(1)
  const [expiryDays, setExpiryDays] = useState(30)
  const [creating, setCreating] = useState(false)

  // Result display
  const [lastResults, setLastResults] = useState<CreateResult[] | null>(null)

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
      fetchInvites()
    }
  }, [status, session, router])

  async function fetchInvites() {
    try {
      const res = await fetch("/api/admin/invites")
      if (!res.ok) throw new Error("Failed to fetch invites")
      const data = await res.json()
      setInvites(data.invites)
    } catch (err) {
      toast.error("Failed to load invites")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvite() {
    setCreating(true)
    setLastResults(null)

    try {
      const body: Record<string, unknown> = {
        maxUses,
        expiryDays,
      }

      if (createMode === "individual") {
        if (!candidateEmail) {
          toast.error("Candidate email is required")
          setCreating(false)
          return
        }
        body.candidates = [{ name: candidateName || undefined, email: candidateEmail }]
        body.count = 1
      } else {
        body.count = batchCount
      }

      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create invites")
      }

      if (createMode === "individual" && data.invites) {
        setLastResults(data.invites)
        const sentCount = data.invites.filter(
          (r: CreateResult) => r.emailStatus === "sent"
        ).length
        const failedCount = data.invites.filter(
          (r: CreateResult) => r.emailStatus === "failed"
        ).length
        if (sentCount > 0) {
          toast.success(`Invite sent to ${candidateEmail}`)
        }
        if (failedCount > 0) {
          toast.error(
            `Failed to send email to ${failedCount} candidate(s). The invite was created but email delivery failed.`
          )
        }
        setCandidateName("")
        setCandidateEmail("")
      } else {
        toast.success(`Created ${batchCount} invite(s)`)
      }

      fetchInvites()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invites")
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  function isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date()
  }

  function resetAndClose() {
    setDialogOpen(false)
    setLastResults(null)
    setCandidateName("")
    setCandidateEmail("")
    setBatchCount(1)
    setMaxUses(1)
    setExpiryDays(30)
    setCreateMode("individual")
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground">Loading invites...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Management</h1>
          <p className="mt-1 text-muted-foreground">
            Invite candidates or create batch invite codes
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Invite</DialogTitle>
              <DialogDescription>
                Send an invite to a candidate or generate batch codes
              </DialogDescription>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex rounded-lg border p-1 bg-muted/50">
              <button
                onClick={() => setCreateMode("individual")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  createMode === "individual"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Send className="h-4 w-4" />
                Send Invite
              </button>
              <button
                onClick={() => setCreateMode("batch")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  createMode === "batch"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="h-4 w-4" />
                Batch Create
              </button>
            </div>

            <div className="grid gap-4 py-2">
              {createMode === "individual" ? (
                <>
                  {/* Candidate Name */}
                  <div className="space-y-2">
                    <Label htmlFor="candidateName">Candidate Name</Label>
                    <Input
                      id="candidateName"
                      placeholder="e.g. Priya Sharma"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional — used in the email greeting
                    </p>
                  </div>

                  {/* Candidate Email */}
                  <div className="space-y-2">
                    <Label htmlFor="candidateEmail">
                      Candidate Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="candidateEmail"
                      type="email"
                      placeholder="priya@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="count">Number of invite codes</Label>
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    max={100}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Codes are created without an associated email
                  </p>
                </div>
              )}

              <Separator />

              {/* Common settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max uses per code</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min={1}
                    max={10}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDays">Expires in (days)</Label>
                  <Input
                    id="expiryDays"
                    type="number"
                    min={1}
                    max={365}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Results after creation */}
            {lastResults && lastResults.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Results</p>
                {lastResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 rounded-md bg-background p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {result.candidateName || result.candidateEmail}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        {result.code}
                      </p>
                      {result.emailStatus === "failed" && (
                        <p className="text-xs text-destructive mt-1">
                          Email failed: {result.emailError || "Unknown error"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.emailStatus === "sent" && (
                        <Badge variant="default" className="text-xs gap-1">
                          <Mail className="h-3 w-3" />
                          Sent
                        </Badge>
                      )}
                      {result.emailStatus === "failed" && (
                        <Badge variant="destructive" className="text-xs">
                          Failed
                        </Badge>
                      )}
                      <CopyButton text={result.code} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={resetAndClose}>
                {lastResults ? "Close" : "Cancel"}
              </Button>
              {!lastResults && (
                <Button
                  onClick={handleCreateInvite}
                  disabled={
                    creating ||
                    (createMode === "individual" && !candidateEmail)
                  }
                >
                  {creating
                    ? "Creating..."
                    : createMode === "individual"
                    ? "Send Invite"
                    : `Create ${batchCount} Code(s)`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invites</CardTitle>
          <CardDescription>
            {invites.length} invite(s) generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No invites created yet. Create your first invite above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const expired = isExpired(invite.expiresAt)
                  const exhausted = invite.usedCount >= invite.maxUses

                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        {invite.candidateName || invite.candidateEmail ? (
                          <div>
                            <p className="text-sm font-medium">
                              {invite.candidateName || "—"}
                            </p>
                            {invite.candidateEmail && (
                              <p className="text-xs text-muted-foreground">
                                {invite.candidateEmail}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {invite.code.substring(0, 8)}...
                          </code>
                          <CopyButton text={invite.code} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {invite.creator.name || invite.creator.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {invite.usedCount} / {invite.maxUses}
                      </TableCell>
                      <TableCell>
                        {invite.sentAt ? (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 text-green-600 border-green-200 bg-green-50"
                          >
                            <Mail className="h-3 w-3" />
                            Sent
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : exhausted ? (
                          <Badge variant="secondary">Exhausted</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
