import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import { z } from "zod"

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id },
      include: {
        webhookEvents: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    })

    if (!endpoint) {
      return NextResponse.json({ error: "Webhook endpoint not found" }, { status: 404 })
    }

    return NextResponse.json({ endpoint })
  } catch (error) {
    console.error("Get webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateWebhookSchema.safeParse(body)

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
