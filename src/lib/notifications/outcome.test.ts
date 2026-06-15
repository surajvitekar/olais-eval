import { vi, describe, it, expect, beforeEach } from "vitest"

// Mock dependencies before importing the module under test
vi.mock("@/lib/notifications/index", () => ({
  sendNotification: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}))

import { sendOutcomeNotification } from "./outcome"
import { sendNotification } from "@/lib/notifications/index"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

const mockSendNotification = vi.mocked(sendNotification)
const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockLogAudit = vi.mocked(logAudit)

const mockUser = {
  id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+919876543210",
}

const successNotificationResult = {
  channel: "email" as const,
  email: { success: true, id: "email-123" },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("sendOutcomeNotification", () => {
  it("sends SELECTED notification with subject containing 'selected' or 'congratulations'", async () => {
    mockFindUnique.mockResolvedValue(mockUser as never)
    mockSendNotification.mockResolvedValue(successNotificationResult as never)

    await sendOutcomeNotification("user-1", "SELECTED")

    expect(mockSendNotification).toHaveBeenCalledOnce()
    const payload = mockSendNotification.mock.calls[0][0]
    expect(payload.subject.toLowerCase()).toMatch(/selected|congratulations/)
  })

  it("sends REJECTED notification with correct template rendered", async () => {
    mockFindUnique.mockResolvedValue(mockUser as never)
    mockSendNotification.mockResolvedValue(successNotificationResult as never)

    await sendOutcomeNotification("user-1", "REJECTED")

    expect(mockSendNotification).toHaveBeenCalledOnce()
    const payload = mockSendNotification.mock.calls[0][0]
    // HTML template should contain the candidate name
    expect(payload.html).toContain("Jane Doe")
    expect(payload.html).toBeTruthy()
  })

  it("logs audit with action 'notification.outcome.sent'", async () => {
    mockFindUnique.mockResolvedValue(mockUser as never)
    mockSendNotification.mockResolvedValue(successNotificationResult as never)

    await sendOutcomeNotification("user-1", "SELECTED")

    expect(mockLogAudit).toHaveBeenCalledOnce()
    const [action, metadata, auditUserId] = mockLogAudit.mock.calls[0]
    expect(action).toBe("notification.outcome.sent")
    expect(metadata).toMatchObject({ userId: "user-1", outcome: "SELECTED" })
    expect(auditUserId).toBe("user-1")
  })

  it("returns sent: true on success", async () => {
    mockFindUnique.mockResolvedValue(mockUser as never)
    mockSendNotification.mockResolvedValue(successNotificationResult as never)

    const result = await sendOutcomeNotification("user-1", "SELECTED")

    expect(result.sent).toBe(true)
    expect(result.channel).toBe("email")
    expect(result.error).toBeUndefined()
  })

  it("returns sent: false with error when user not found", async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await sendOutcomeNotification("nonexistent-user", "SELECTED")

    expect(result.sent).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.error).toMatch(/not found/i)
    expect(mockSendNotification).not.toHaveBeenCalled()
    expect(mockLogAudit).not.toHaveBeenCalled()
  })
})
