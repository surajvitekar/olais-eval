import prisma from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

/**
 * Log an auditable action to the database.
 *
 * @param action - A descriptive action name (e.g., "user.register", "assessment.complete")
 * @param metadata - Arbitrary data to store with the log entry
 * @param userId - The user who performed the action (optional for anonymous actions)
 */
export async function logAudit(
  action: string,
  metadata: Record<string, unknown> = {},
  userId?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        metadata: metadata as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    // Audit logging should never crash the main operation
    console.error(`Audit log failed for action "${action}":`, error)
  }
}
