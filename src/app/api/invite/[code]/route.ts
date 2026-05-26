import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      )
    }

    const invite = await prisma.invite.findUnique({
      where: { code },
    })

    if (!invite) {
      return NextResponse.json(
        { valid: false, error: "Invalid invite code" },
        { status: 200 }
      )
    }

    const now = new Date()
    const isExpired = now > invite.expiresAt
    const hasRemainingUses = invite.usedCount < invite.maxUses
    const isValid = !isExpired && hasRemainingUses

    return NextResponse.json({
      valid: isValid,
      code: invite.code,
      expiresAt: invite.expiresAt.toISOString(),
      usedCount: invite.usedCount,
      maxUses: invite.maxUses,
      ...(isExpired && { error: "Invite code has expired" }),
      ...(!hasRemainingUses && { error: "Invite code has reached maximum uses" }),
    })
  } catch (error) {
    console.error("Invite validation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
