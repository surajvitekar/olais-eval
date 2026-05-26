import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations/auth"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { logAudit } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateKey = getRateLimitKey(request)
    const rateCheck = checkRateLimit(rateKey)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { inviteCode, name, email, password, phone, college } = parsed.data

    // Validate invite code
    const invite = await prisma.invite.findUnique({
      where: { code: inviteCode },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 400 }
      )
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "Invite code has expired" },
        { status: 400 }
      )
    }

    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: "Invite code has reached maximum uses" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user and increment invite usage in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          phone: phone || null,
          college: college || null,
          role: "CANDIDATE",
          status: "REGISTERED",
        },
      })

      await tx.invite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      })

      return newUser
    })

    // Audit: user registration
    await logAudit("user.register", {
      email: user.email,
      inviteCode,
    }, user.id)

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
