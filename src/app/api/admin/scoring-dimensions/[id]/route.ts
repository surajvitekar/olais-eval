/**
 * ─── OLAIS EVAL — Scoring Dimension Single API ─────────────────────────────
 * PUT    /api/admin/scoring-dimensions/[id]  - Update a dimension
 * DELETE /api/admin/scoring-dimensions/[id]  - Delete a dimension
 *
 * Auth-protected: requires ADMIN role.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import { z } from "zod"

// ── Validation Schema ──────────────────────────────────────────────────────

const updateDimensionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  maxScore: z.number().int().min(0).max(100).optional(),
  weight: z.number().min(0).max(10).optional(),
  rubric: z
    .array(
      z.object({
        level: z.number().int().min(0),
        label: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

// ── PUT: Update dimension ──────────────────────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_SETTINGS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const existing = await prisma.scoringDimension.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Scoring dimension not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateDimensionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const dimension = await prisma.scoringDimension.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(dimension)
  } catch (error) {
    console.error("Update scoring dimension error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── DELETE: Remove dimension ───────────────────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_SETTINGS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const existing = await prisma.scoringDimension.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Scoring dimension not found" },
        { status: 404 }
      )
    }

    await prisma.scoringDimension.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete scoring dimension error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
