import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { signIn } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { loginSchema } from "@/lib/validations/auth"
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
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    // Check user exists
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Sign in using NextAuth
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
    } catch {
      // signIn throws on failure but we handle it
    }

    // Audit: user login
    await logAudit("user.login", {
      email: user.email,
    }, user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
