import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { generateRecommendation } from "@/lib/recommendations"
import { z } from "zod"
import type { UserRole } from "@/types"

// Roles permitted to access this endpoint
const ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "REVIEWER", "HIRING_MANAGER"]

function isAllowed(role: string | undefined | null): boolean {
  if (!role) return false
  return ALLOWED_ROLES.includes(role as UserRole)
}

const patchSchema = z.object({
  verdict: z.enum(["HIRE", "REJECT", "BORDERLINE"]),
  notes: z.string(),
})

// GET /api/admin/recommendations/[candidateId]
// Returns the generated recommendation for a candidate.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { candidateId } = await params

    const recommendation = await generateRecommendation(candidateId)

    return NextResponse.json({ recommendation })
  } catch (error) {
    console.error("Get recommendation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/recommendations/[candidateId]
// Overrides the auto-generated verdict. Stores the override in AuditLog
// and updates the candidate's user.status for HIRE/REJECT verdicts.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { candidateId } = await params

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { verdict, notes } = parsed.data

    // Capture the previous auto-generated verdict for the audit trail
    const previous = await generateRecommendation(candidateId)
    const previousVerdict = previous.verdict

    // Update user status based on the override verdict
    if (verdict === "HIRE") {
      await prisma.user.update({
        where: { id: candidateId },
        data: { status: "SELECTED" },
      })
    } else if (verdict === "REJECT") {
      await prisma.user.update({
        where: { id: candidateId },
        data: { status: "REJECTED" },
      })
    }
    // BORDERLINE → no status change

    // Log the override to the AuditLog
    await logAudit(
      "recommendation.override",
      {
        candidateId,
        verdict,
        notes,
        previousVerdict,
      },
      session.user.id
    )

    return NextResponse.json({
      success: true,
      verdict,
      notes,
      previousVerdict,
    })
  } catch (error) {
    console.error("Patch recommendation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
