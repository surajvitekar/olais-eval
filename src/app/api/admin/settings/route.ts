import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const settingsSchema = z.object({
  maxParticipants: z.number().int().min(1).max(10000).optional(),
  deadline: z.string().optional(),
  leaderboardPublic: z.boolean().optional(),
})

// Settings are stored as a singleton in AuditLog-like metadata or a simple file-based approach.
// For now, we use an in-memory pattern stored by the API and returned.
// In production, you'd store this in a database table. For simplicity, we use a JSON approach.

// We store settings in a special config file approach using audit log.
// The "latest" settings with action "CAMPAIGN_CONFIG" has the current config.

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Try to get the latest campaign config from AuditLog
    const configLog = await prisma.auditLog.findFirst({
      where: { action: "CAMPAIGN_CONFIG" },
      orderBy: { createdAt: "desc" },
    })

    let config = {
      maxParticipants: 100,
      deadline: "",
      leaderboardPublic: true,
    }

    if (configLog && configLog.metadata) {
      const meta = configLog.metadata as Record<string, unknown>
      config = {
        maxParticipants: (meta.maxParticipants as number) ?? 100,
        deadline: (meta.deadline as string) ?? "",
        leaderboardPublic: (meta.leaderboardPublic as boolean) ?? true,
      }
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Store settings as an AuditLog entry for persistence
    const configLog = await prisma.auditLog.findFirst({
      where: { action: "CAMPAIGN_CONFIG" },
      orderBy: { createdAt: "desc" },
    })

    let currentConfig = {
      maxParticipants: 100,
      deadline: "",
      leaderboardPublic: true,
    }

    if (configLog) {
      const meta = configLog.metadata as Record<string, unknown>
      currentConfig = {
        maxParticipants: (meta.maxParticipants as number) ?? 100,
        deadline: (meta.deadline as string) ?? "",
        leaderboardPublic: (meta.leaderboardPublic as boolean) ?? true,
      }
    }

    // Merge with new values
    const updatedConfig = {
      ...currentConfig,
      ...(parsed.data.maxParticipants !== undefined && { maxParticipants: parsed.data.maxParticipants }),
      ...(parsed.data.deadline !== undefined && { deadline: parsed.data.deadline }),
      ...(parsed.data.leaderboardPublic !== undefined && { leaderboardPublic: parsed.data.leaderboardPublic }),
    }

    // Create audit log with new config
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CAMPAIGN_CONFIG",
        metadata: updatedConfig,
      },
    })

    return NextResponse.json({ config: updatedConfig })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
