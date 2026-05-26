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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Invite {
  id: string
  code: string
  maxUses: number
  usedCount: number
  expiresAt: string
  createdAt: string
  creator: {
    name: string | null
    email: string
  }
}

export default function AdminInvitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Create invite form
  const [batchCount, setBatchCount] = useState(1)
  const [maxUses, setMaxUses] = useState(1)
  const [expiryDays, setExpiryDays] = useState(30)
  const [creating, setCreating] = useState(false)

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

  async function handleCreateInvites() {
    setCreating(true)
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: batchCount,
          maxUses,
          expiryDays,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create invites")
      }

      toast.success(`Created ${batchCount} invite(s)`)
      setDialogOpen(false)
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
            Create and manage candidate invitation codes
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>Create Invites</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invite Batch</DialogTitle>
              <DialogDescription>
                Generate one or more unique invite codes
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="count">Number of invites</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={100}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max uses per invite</Label>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvites} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
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
              No invites created yet. Create your first batch above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Uses</TableHead>
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
                      <TableCell className="font-mono text-xs">
                        {invite.code.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {invite.creator.name || invite.creator.email}
                      </TableCell>
                      <TableCell>
                        {invite.usedCount} / {invite.maxUses}
                      </TableCell>
                      <TableCell className="text-xs">
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
