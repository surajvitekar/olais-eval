import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"

// ─── GET: List all email templates ──────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.VIEW_SETTINGS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("List email templates error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ─── POST: Create a new email template ──────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_SETTINGS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { name, subject, htmlBody, isActive } = body

    if (!name || !subject || !htmlBody) {
      return NextResponse.json(
        { error: "name, subject, and htmlBody are required" },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = await prisma.emailTemplate.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlBody,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Create email template error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ─── PUT: Update an existing email template ─────────────────────────────────

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_SETTINGS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, subject, htmlBody, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      )
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // If renaming, check the new name doesn't clash with another template
    if (name && name !== existing.name) {
      const nameConflict = await prisma.emailTemplate.findUnique({
        where: { name },
      })
      if (nameConflict) {
        return NextResponse.json(
          { error: "A template with this name already exists" },
          { status: 409 }
        )
      }
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(htmlBody !== undefined && { htmlBody }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Update email template error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ─── DELETE: Delete an email template ───────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_SETTINGS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      )
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    await prisma.emailTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete email template error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
