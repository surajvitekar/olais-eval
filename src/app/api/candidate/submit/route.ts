import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const submitSchema = z.object({
  assignedProblemId: z.string().min(1),
  gitUrl: z.string().url("Invalid git URL").or(z.string().startsWith("git@")),
  liveUrl: z.string().url().nullable().optional(),
  architectureNotes: z.string().min(10, "Architecture notes must be at least 10 characters"),
  aiUsageExplanation: z.string().min(1, "AI usage declaration is required"),
})

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
