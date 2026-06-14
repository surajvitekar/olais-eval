import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// ─── Validation Schema ───────────────────────────────────────────────────────

const brandingSchema = z.object({
  companyName: z.string().min(1).max(200).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  faviconUrl: z.string().url().max(500).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #10b981").optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
  customDomain: z.string().min(1).max(200).optional().nullable(),
  emailFromName: z.string().min(1).max(200).optional().nullable(),
  emailFromAddress: z.string().email().max(200).optional().nullable(),
  loginBackground: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
})

// ─── Admin Auth Check ────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

// ─── GET: Retrieve current brand config ─────────────────────────────────────

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Return the active brand config, or the most recently updated one
    const brand = await prisma.brandConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ brand: brand ?? null })
  } catch (error) {
    console.error("Get brand config error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ─── POST: Create new brand config ─────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = brandingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // If setting this brand as active, deactivate all others first
    if (data.isActive) {
      await prisma.brandConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    const brand = await prisma.brandConfig.create({
      data: {
        companyName: data.companyName ?? null,
        logoUrl: data.logoUrl ?? null,
        faviconUrl: data.faviconUrl ?? null,
        primaryColor: data.primaryColor ?? "#10b981",
        secondaryColor: data.secondaryColor ?? "#1f2937",
        accentColor: data.accentColor ?? "#6366f1",
        customDomain: data.customDomain ?? null,
        emailFromName: data.emailFromName ?? null,
        emailFromAddress: data.emailFromAddress ?? null,
        loginBackground: data.loginBackground ?? null,
        isActive: data.isActive ?? false,
      },
    })

    return NextResponse.json({ brand }, { status: 201 })
  } catch (error) {
    console.error("Create brand config error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ─── PUT: Update brand config (sends id in body) ───────────────────────────

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...rest } = body

    if (!id) {
      return NextResponse.json(
        { error: "id is required in the request body" },
        { status: 400 }
      )
    }

    const existing = await prisma.brandConfig.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Brand config not found" },
        { status: 404 }
      )
    }

    const parsed = brandingSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // If activating this brand, deactivate all others first
    if (data.isActive) {
      await prisma.brandConfig.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      })
    }

    const brand = await prisma.brandConfig.update({
      where: { id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor !== undefined && { secondaryColor: data.secondaryColor }),
        ...(data.accentColor !== undefined && { accentColor: data.accentColor }),
        ...(data.customDomain !== undefined && { customDomain: data.customDomain }),
        ...(data.emailFromName !== undefined && { emailFromName: data.emailFromName }),
        ...(data.emailFromAddress !== undefined && { emailFromAddress: data.emailFromAddress }),
        ...(data.loginBackground !== undefined && { loginBackground: data.loginBackground }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return NextResponse.json({ brand })
  } catch (error) {
    console.error("Update brand config error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
