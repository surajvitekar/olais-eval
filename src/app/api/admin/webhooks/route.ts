import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import { z } from "zod"
import * as crypto from "crypto"

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
})

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
})

function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex")
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const includeEvents = url.searchParams.get("includeEvents") === "true"

    const endpoints = await prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: "desc" },
      include: includeEvents
        ? {
            webhookEvents: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          }
        : undefined,
    })

    return NextResponse.json({ endpoints })
  } catch (error) {
    console.error("List webhooks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createWebhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const secret = generateSecret()

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: parsed.data.name,
        url: parsed.data.url,
        secret,
        events: parsed.data.events,
      },
    })

    return NextResponse.json({ endpoint, secret }, { status: 201 })
  } catch (error) {
    console.error("Create webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: "Endpoint id is required" }, { status: 400 })
    }

    const parsed = updateWebhookSchema.safeParse(updateData)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const endpoint = await prisma.webhookEndpoint.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ endpoint })
  } catch (error) {
    console.error("Update webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Endpoint id is required" }, { status: 400 })
    }

    // Delete associated events first
    await prisma.webhookEvent.deleteMany({
      where: { endpointId: id },
    })

    await prisma.webhookEndpoint.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
