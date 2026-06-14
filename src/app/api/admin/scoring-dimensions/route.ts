/**
 * ─── OLAIS EVAL — Scoring Dimensions CRUD API ──────────────────────────────
 * GET    /api/admin/scoring-dimensions  - List all scoring dimensions
 * POST   /api/admin/scoring-dimensions  - Create a new scoring dimension
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

const createDimensionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  minScore: z.number().int().min(0).max(100).default(0),
  maxScore: z.number().int().min(0).max(100).default(100),
  weight: z.number().min(0).max(10).default(1.0),
  rubric: z
    .array(
      z.object({
        level: z.number().int().min(0),
        label: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

// ── GET: List all dimensions ───────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth()
    if (
      !session?.user ||
      !hasPermission(session.user.role as UserRole, Permission.MANAGE_SETTINGS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const dimensions = await prisma.scoringDimension.findMany({
      orderBy: { displayOrder: "asc" },
    })

    return NextResponse.json({ dimensions })
  } catch (error) {
    console.error("List scoring dimensions error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── POST: Create dimension ──────────────────────────────────────────────────

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
    const parsed = createDimensionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const dimension = await prisma.scoringDimension.create({
      data: parsed.data,
    })

    return NextResponse.json(dimension, { status: 201 })
  } catch (error) {
    console.error("Create scoring dimension error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
