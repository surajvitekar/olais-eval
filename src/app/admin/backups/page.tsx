"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"

interface BackupFile {
  filename: string
  size: number
  sizeFormatted: string
  date: string
  timestamp: string
  retention: {
    isSunday: boolean
    isFirstOfMonth: boolean
    age: string
  }
}

interface BackupConfig {
  retentionDaily: number
  retentionWeekly: number
  retentionMonthly: number
  backupDir: string
  schedule: {
    daily: string
    weekly: string
    monthly: string
  }
}

interface BackupResponse {
  backups: BackupFile[]
  config: BackupConfig
  count: number
}

type BackupStatus = "idle" | "running" | "success" | "error"

export default function AdminBackupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [backupData, setBackupData] = useState<BackupResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [backupStatus, setBackupStatus] = useState<BackupStatus>("idle")
  const [backupMessage, setBackupMessage] = useState("")
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [restoreFile, setRestoreFile] = useState<BackupFile | null>(null)
  const [restoreStep, setRestoreStep] = useState<"confirm" | "double-confirm" | "running" | "done">("confirm")
  const [restoreInput, setRestoreInput] = useState("")

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backups")
      if (!res.ok) throw new Error("Failed to fetch backups")
      const data = await res.json()
      setBackupData(data)
    } catch (err) {
      toast.error("Failed to load backups")
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
      fetchBackups()
    }
  }, [status, session, router, fetchBackups])

  async function handleRunBackup() {
    setBackupStatus("running")
    setBackupMessage("")
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      })
      const data = await res.json()
      if (data.success) {
        setBackupStatus("success")
        setBackupMessage("Backup completed successfully")
        toast.success("Backup completed successfully")
        fetchBackups()
      } else {
        setBackupStatus("error")
        setBackupMessage(data.error || "Backup failed")
        toast.error(data.error || "Backup failed")
      }
    } catch (err) {
      setBackupStatus("error")
      setBackupMessage("Failed to trigger backup")
      toast.error("Failed to trigger backup")
    }
  }

  function openRestoreDialog(backup: BackupFile) {
    setRestoreFile(backup)
    setRestoreStep("confirm")
    setRestoreInput("")
    setRestoreDialogOpen(true)
  }

  async function handleRestore() {
    if (!restoreFile) return

    if (restoreStep === "confirm") {
      setRestoreStep("double-confirm")
      return
    }

    if (restoreStep === "double-confirm") {
      if (restoreInput !== restoreFile.filename) {
        toast.error("Filename does not match")
        return
      }
      setRestoreStep("running")
      try {
        const res = await fetch("/api/admin/backups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restore",
            file: restoreFile.filename,
            confirmed: true,
            doubleConfirmed: true,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setRestoreStep("done")
          toast.success(`Restore from ${restoreFile.filename} completed`)
          fetchBackups()
        } else {
          setRestoreStep("confirm")
          toast.error(data.error || "Restore failed")
        }
      } catch (err) {
        setRestoreStep("confirm")
        toast.error("Restore failed")
      }
    }
  }

  if (loading || !backupData) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner text="Loading backups..." />
      </div>
    )
  }

  const { backups, config } = backupData
  const lastBackup = backups.length > 0 ? backups[0] : null
  const lastBackupDate = lastBackup
    ? new Date(lastBackup.timestamp).toLocaleString()
    : "No backups yet"

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Database Backups</h1>
        <p className="mt-1 text-muted-foreground">
          Automated PostgreSQL backup management with retention policies
        </p>
      </div>

      {/* Status & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Backup</p>
                <p className="text-sm font-bold mt-1">
                  {lastBackupDate}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-950/30">
                <Database className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Backups</p>
                <p className="text-3xl font-bold mt-1">{backupData.count}</p>
              </div>
              <div className="rounded-xl p-3 bg-purple-50 dark:bg-purple-950/30">
                <HardDrive className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Retention</p>
                <p className="text-3xl font-bold mt-1">{config.retentionDaily}</p>
              </div>
              <div className="rounded-xl p-3 bg-green-50 dark:bg-green-950/30">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-sm font-bold mt-1">
                  {backupStatus === "running" ? (
                    <span className="text-yellow-600">Running...</span>
                  ) : backupStatus === "error" ? (
                    <span className="text-red-600">Failed</span>
                  ) : (
                    <span className="text-green-600">Idle</span>
                  )}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-orange-50 dark:bg-orange-950/30">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Schedule Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Backup Schedule &amp; Retention Policy</CardTitle>
          <CardDescription>
            Automatic backup schedule and retention configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Daily Backups</p>
                <p className="text-xs text-muted-foreground">{config.schedule.daily}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep last {config.retentionDaily} backups
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Weekly Backups</p>
                <p className="text-xs text-muted-foreground">{config.schedule.weekly}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep last {config.retentionWeekly} Sunday backups
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Monthly Backups</p>
                <p className="text-xs text-muted-foreground">{config.schedule.monthly}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep last {config.retentionMonthly} month-start backups
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Backup Status */}
      {backupMessage && (
        <Card className="mb-8">
          <CardContent className="pt-4">
            <div className={`flex items-center gap-2 ${
              backupStatus === "error" ? "text-red-600" : "text-green-600"
            }`}>
              {backupStatus === "error" ? (
                <XCircle className="h-5 w-5" />
              ) : backupStatus === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <RefreshCw className="h-5 w-5 animate-spin" />
              )}
              <span className="text-sm font-medium">{backupMessage}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={handleRunBackup}
          disabled={backupStatus === "running"}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${
            backupStatus === "running" ? "animate-spin" : ""
          }`} />
          {backupStatus === "running" ? "Backing up..." : "Run Backup Now"}
        </Button>
      </div>

      {/* Backup Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Files</CardTitle>
          <CardDescription>
            All available database backups in {config.backupDir}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="py-8 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No backups yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Run Backup Now" to create the first backup
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Backup File</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell className="font-mono text-xs">
                      {backup.filename}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(backup.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{backup.sizeFormatted}</TableCell>
                    <TableCell className="text-xs">
                      {backup.retention.age}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {backup.retention.isSunday && (
                          <Badge variant="outline" className="text-[10px]">W</Badge>
                        )}
                        {backup.retention.isFirstOfMonth && (
                          <Badge variant="outline" className="text-[10px]">M</Badge>
                        )}
                        {!backup.retention.isSunday && !backup.retention.isFirstOfMonth && (
                          <Badge variant="secondary" className="text-[10px]">D</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            // Download via redirect
                            window.open(`/api/admin/backups/download?file=${encodeURIComponent(backup.filename)}`, "_blank")
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => openRestoreDialog(backup)}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Restore
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

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setRestoreDialogOpen(false)
          setRestoreFile(null)
          setRestoreStep("confirm")
          setRestoreInput("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {restoreStep === "confirm" ? "Confirm Database Restore" :
               restoreStep === "double-confirm" ? "Double Confirm Restore" :
               restoreStep === "running" ? "Restoring..." : "Restore Complete"}
            </DialogTitle>
            <DialogDescription>
              {restoreStep === "confirm" && restoreFile && (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">
                      This will permanently overwrite the current database!
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Backup:</strong> {restoreFile.filename}</p>
                    <p><strong>Size:</strong> {restoreFile.sizeFormatted}</p>
                    <p><strong>Date:</strong> {new Date(restoreFile.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {restoreStep === "double-confirm" && restoreFile && (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">
                      Final confirmation required. Type the backup filename to proceed.
                    </span>
                  </div>
                  <div className="mt-2">
                    <label className="text-sm font-medium block mb-1">
                      Type <code className="bg-muted px-1 rounded">{restoreFile.filename}</code> to confirm:
                    </label>
                    <input
                      type="text"
                      value={restoreInput}
                      onChange={(e) => setRestoreInput(e.target.value)}
                      placeholder={restoreFile.filename}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}
              {restoreStep === "running" && (
                <div className="flex items-center justify-center py-6">
                  <LoadingSpinner text="Restoring database... This may take a while." />
                </div>
              )}
              {restoreStep === "done" && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg mt-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">
                    Database restored successfully from {restoreFile?.filename}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {restoreStep === "confirm" && (
              <>
                <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRestore}>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Yes, Restore Database
                </Button>
              </>
            )}
            {restoreStep === "double-confirm" && (
              <>
                <Button variant="outline" onClick={() => {
                  setRestoreStep("confirm")
                  setRestoreInput("")
                }}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRestore}
                  disabled={restoreInput !== restoreFile?.filename}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Execute Restore
                </Button>
              </>
            )}
            {restoreStep === "done" && (
              <Button onClick={() => {
                setRestoreDialogOpen(false)
                setRestoreFile(null)
                setRestoreStep("confirm")
                setRestoreInput("")
              }}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Script Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Backup Scripts</CardTitle>
          <CardDescription>
            Scripts used for automated and manual database operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Database className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">docker/backup/backup.sh</p>
                <p className="text-xs text-muted-foreground">
                  Runs pg_dump against the PostgreSQL container, creates timestamped backups,
                  and applies retention policy (last 7 daily, 4 weekly, 3 monthly).
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Crontab: 0 2 * * * /app/docker/backup/backup.sh
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <RotateCcw className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">docker/backup/restore.sh</p>
                <p className="text-xs text-muted-foreground">
                  Restores a PostgreSQL database from a backup file with double confirmation.
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Usage: docker/backup/restore.sh /backup/backup_20250101_120000.sql.gz
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
