import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  // System under maintenance — submissions temporarily disabled
  return NextResponse.json(
    {
      error: "Submissions are temporarily disabled while the assessment system is being updated. Please try again later.",
      code: "MAINTENANCE_MODE",
    },
    { status: 503 }
  )
}
