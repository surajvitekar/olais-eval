import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { stat } from "fs/promises"
import { createReadStream } from "fs"
import path from "path"

const BACKUP_DIR = "/backup"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const file = searchParams.get("file")

    if (!file) {
      return NextResponse.json({ error: "Backup filename required" }, { status: 400 })
    }

    // Prevent path traversal
    if (file.includes("..") || file.includes("/")) {
      return NextResponse.json({ error: "Invalid backup filename" }, { status: 400 })
    }

    const filePath = path.join(BACKUP_DIR, file)

    try {
      await stat(filePath)
    } catch {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 })
    }

    const fileStream = createReadStream(filePath)

    return new NextResponse(fileStream as any, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Backup download error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
