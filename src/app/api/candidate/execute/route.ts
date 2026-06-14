/**
 * ─── OLAIS EVAL — Candidate Code Execution API ───────────────────────────
 * POST /api/candidate/execute
 *
 * Accepts JSON body: { code, language, problemId }
 * Runs code in a Docker sandbox container and returns the result.
 *
 * Auth-protected: requires a valid candidate session.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { executeCode } from "@/lib/sandbox/execute"
import { z } from "zod"

// ── Schema ────────────────────────────────────────────────────────────────

const executeSchema = z.object({
  code: z.string().min(1, "Code cannot be empty").max(50_000, "Code too large (max 50KB)"),
  language: z.enum(["python", "javascript", "cpp", "java", "py", "js", "node", "c++", "cplusplus"]),
  problemId: z.string().optional(),
})

// ── POST handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only candidates can execute code
    if (session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Only candidates can execute code" }, { status: 403 })
    }

    // 2. Validate input
    const body = await request.json()
    const parsed = executeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { code, language: rawLanguage, problemId } = parsed.data

    // Normalize language aliases before passing to executor
    const langNormalized: Record<string, string> = {
      py: "python", python: "python",
      js: "javascript", javascript: "javascript",
      node: "javascript", nodejs: "javascript",
      cpp: "cpp", "c++": "cpp", cplusplus: "cpp",
      java: "java",
    }
    const language = (langNormalized[rawLanguage] || "python") as "python" | "javascript" | "cpp" | "java"

    // 3. Optional: verify candidate has access to this problem
    if (problemId) {
      const { prisma } = await import("@/lib/prisma")
      const assignedProblem = await prisma.assignedProblem.findFirst({
        where: {
          id: problemId,
          userId: session.user.id,
        },
      })
      if (!assignedProblem) {
        return NextResponse.json(
          { error: "Problem not found or not assigned to you" },
          { status: 404 }
        )
      }
    }

    // 4. Execute code in sandbox
    const result = await executeCode(code, language)

    // 5. Return result
    return NextResponse.json(result)
  } catch (error) {
    console.error("Code execution error:", error)
    return NextResponse.json(
      { error: "Code execution failed. Is the sandbox Docker image built?" },
      { status: 500 }
    )
  }
}
