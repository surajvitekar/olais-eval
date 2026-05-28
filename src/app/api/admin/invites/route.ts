import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inviteCreateSchema } from "@/lib/validations/auth"
import crypto from "crypto"
import { logAudit } from "@/lib/audit"
import { sendInviteEmail } from "@/lib/email"

function generateUUID(): string {
  return crypto.randomUUID()
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error("List invites error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = inviteCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { count, maxUses, expiryDays, candidates } = parsed.data
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    // ─── Scenario A: Individual invites with candidate details ────────────────
    if (candidates && candidates.length > 0) {
      const results: {
        code: string
        candidateName?: string
        candidateEmail: string
        emailStatus: "sent" | "failed" | "skipped"
        emailError?: string
      }[] = []

      for (const candidate of candidates) {
        // Create invite
        const invite = await prisma.invite.create({
          data: {
            code: generateUUID(),
            candidateName: candidate.name || null,
            candidateEmail: candidate.email,
            maxUses,
            expiresAt,
            createdBy: session.user.id,
          },
        })

        // Send email
        try {
          await sendInviteEmail({
            to: candidate.email,
            candidateName: candidate.name,
            inviteCode: invite.code,
            expiresAt,
          })

          // Mark as sent
          await prisma.invite.update({
            where: { id: invite.id },
            data: { sentAt: new Date() },
          })

          results.push({
            code: invite.code,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            emailStatus: "sent",
          })
        } catch (emailErr) {
          console.error(`Failed to send invite email to ${candidate.email}:`, emailErr)
          results.push({
            code: invite.code,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            emailStatus: "failed",
            emailError: emailErr instanceof Error ? emailErr.message : "Unknown error",
          })
        }
      }

      // Audit
      await logAudit("invite.create", {
        count: results.length,
        sent: results.filter((r) => r.emailStatus === "sent").length,
        failed: results.filter((r) => r.emailStatus === "failed").length,
        maxUses,
        expiryDays,
      }, session.user.id)

      return NextResponse.json(
        {
          message: `Created ${results.length} invite(s) — ${results.filter((r) => r.emailStatus === "sent").length} email(s) sent`,
          invites: results,
        },
        { status: 201 }
      )
    }

    // ─── Scenario B: Legacy batch (no candidates) ─────────────────────────────
    const invites = await prisma.$transaction(async (tx) => {
      const created = []
      for (let i = 0; i < count; i++) {
        const invite = await tx.invite.create({
          data: {
            code: generateUUID(),
            maxUses,
            expiresAt,
            createdBy: session.user.id,
          },
        })
        created.push(invite)
      }
      return created
    })

    // Audit
    await logAudit("invite.create", {
      count: invites.length,
      maxUses,
      expiryDays,
      note: "batch (no email)",
    }, session.user.id)

    return NextResponse.json(
      {
        message: `Created ${invites.length} invite(s)`,
        invites: invites.map((inv) => ({
          id: inv.id,
          code: inv.code,
          maxUses: inv.maxUses,
          usedCount: inv.usedCount,
          expiresAt: inv.expiresAt.toISOString(),
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create invites error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
