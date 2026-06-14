import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { exec } from "child_process"
import { promisify } from "util"
import { readdir, stat } from "fs/promises"
import path from "path"
import prisma from "@/lib/prisma"

const execAsync = promisify(exec)

const BACKUP_DIR = "/backup"
const BACKUP_SCRIPT = "/app/docker/backup/backup.sh"
const RESTORE_SCRIPT = "/app/docker/backup/restore.sh"

// Database environment variables for executing backup/restore scripts
function getDbEnv(): Record<string, string> {
  return {
    DB_HOST: process.env.DB_HOST || "db",
    DB_USER: "olais",
    DB_NAME: "olais_eval",
    DB_PASSWORD: process.env.DB_PASSWORD || "",
  }
}

interface BackupFileInfo {
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

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function isSunday(dateStr: string): boolean {
  try {
    const d = new Date(dateStr)
    return d.getUTCDay() === 0
  } catch {
    return false
  }
}

function isFirstOfMonth(dateStr: string): boolean {
  try {
    const d = new Date(dateStr)
    return d.getUTCDate() === 1
  } catch {
    return false
  }
}

function getAgeFromDays(days: number): string {
  if (days < 1) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

function parseBackupFilename(filename: string): { dateStr: string; timestamp: string } | null {
  const match = filename.match(/^backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.sql\.gz$/)
  if (!match) return null
  const [, year, month, day, hour, min, sec] = match
  return {
    dateStr: `${year}-${month}-${day}`,
    timestamp: `${year}-${month}-${day}T${hour}:${min}:${sec}Z`,
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let files: BackupFileInfo[] = []
    const now = new Date()

    try {
      const dirEntries = await readdir(BACKUP_DIR)
      const backupFiles = dirEntries
        .filter((f) => f.startsWith("backup_") && f.endsWith(".sql.gz"))
        .sort()
        .reverse()

      for (const filename of backupFiles) {
        const filePath = path.join(BACKUP_DIR, filename)
        try {
          const fileStat = await stat(filePath)
          const parsed = parseBackupFilename(filename)
          const ageDays = parsed
            ? Math.floor(
                (now.getTime() - new Date(parsed.timestamp).getTime()) / (1000 * 60 * 60 * 24)
              )
            : 0

          files.push({
            filename,
            size: fileStat.size,
            sizeFormatted: formatFileSize(fileStat.size),
            date: parsed?.dateStr || "",
            timestamp: parsed?.timestamp || fileStat.mtime.toISOString(),
            retention: {
              isSunday: parsed ? isSunday(parsed.dateStr) : false,
              isFirstOfMonth: parsed ? isFirstOfMonth(parsed.dateStr) : false,
              age: getAgeFromDays(ageDays),
            },
          })
        } catch {
          // Skip files that can't be stat'd
        }
      }
    } catch {
      // Backup directory might not exist yet
    }

    return NextResponse.json({
      backups: files,
      config: {
        retentionDaily: 7,
        retentionWeekly: 4,
        retentionMonthly: 3,
        backupDir: BACKUP_DIR,
        schedule: {
          daily: "Every day at 02:00 UTC",
          weekly: "Every Sunday at 02:00 UTC",
          monthly: "1st of every month at 02:00 UTC",
        },
      },
      count: files.length,
    })
  } catch (error) {
    console.error("List backups error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === "run") {
      // Run immediate backup
      try {
        const { stdout, stderr } = await execAsync(
          `bash ${BACKUP_SCRIPT}`,
          {
            timeout: 300_000, // 5 minutes
            env: { ...process.env, ...getDbEnv() } as any,
          }
        )
        const output = stdout + stderr

        // Log the backup action
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "BACKUP_RUN",
            metadata: { output, triggeredBy: session.user.email },
          },
        }).catch(() => {})

        return NextResponse.json({
          success: true,
          message: "Backup completed successfully",
          output,
        })
      } catch (execError: any) {
        const errorMsg = execError.stderr || execError.message || "Unknown error"

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "BACKUP_RUN_FAILED",
            metadata: { error: errorMsg, triggeredBy: session.user.email },
          },
        }).catch(() => {})

        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 500 }
        )
      }
    }

    if (action === "restore") {
      const { file, confirmed, doubleConfirmed } = body

      if (!file) {
        return NextResponse.json({ error: "Backup filename required" }, { status: 400 })
      }

      // Validate filename to prevent path traversal
      if (file.includes("..") || file.includes("/")) {
        return NextResponse.json({ error: "Invalid backup filename" }, { status: 400 })
      }

      const filePath = path.join(BACKUP_DIR, file)

      try {
        await stat(filePath)
      } catch {
        return NextResponse.json({ error: "Backup file not found" }, { status: 404 })
      }

      if (!confirmed) {
        return NextResponse.json({
          requiresConfirmation: true,
          message: `Are you sure you want to restore from ${file}? This will overwrite the current database.`,
          file,
        })
      }

      if (!doubleConfirmed) {
        return NextResponse.json({
          requiresDoubleConfirmation: true,
          message: `Type the filename "${file}" to confirm the restore operation.`,
          file,
        })
      }

      // Execute restore
      try {
        const { stdout, stderr } = await execAsync(
          `printf "yes\n${file}\n" | bash ${RESTORE_SCRIPT} "${filePath}"`,
          { timeout: 600_000, env: { ...process.env, ...getDbEnv() } as any } // 10 minutes
        )
        const output = stdout + stderr

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "BACKUP_RESTORE",
            metadata: { file, output, triggeredBy: session.user.email },
          },
        }).catch(() => {})

        return NextResponse.json({
          success: true,
          message: `Restore from ${file} completed successfully`,
          output,
        })
      } catch (execError: any) {
        const errorMsg = execError.stderr || execError.message || "Unknown error"

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "BACKUP_RESTORE_FAILED",
            metadata: { file, error: errorMsg, triggeredBy: session.user.email },
          },
        }).catch(() => {})

        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ error: "Invalid action. Use 'run' or 'restore'." }, { status: 400 })
  } catch (error) {
    console.error("Backup action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
