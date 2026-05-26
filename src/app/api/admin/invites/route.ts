import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inviteCreateSchema } from "@/lib/validations/auth"
import crypto from "crypto"
import { logAudit } from "@/lib/audit"

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

    const { count, maxUses, expiryDays } = parsed.data
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

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

    // Audit: invites created
    await logAudit("invite.create", {
      count: invites.length,
      maxUses,
      expiryDays,
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
