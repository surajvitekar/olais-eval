import { vi, describe, it, expect, beforeEach } from "vitest"

// Mock dependencies before importing the module under test
vi.mock("./whatsapp", () => ({
  sendWhatsApp: vi.fn(),
}))
vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}))
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}))

import { sendNotification } from "./index"
import { sendWhatsApp } from "./whatsapp"
import { sendEmail } from "@/lib/email/send"
import { logAudit } from "@/lib/audit"

const mockSendWhatsApp = vi.mocked(sendWhatsApp)
const mockSendEmail = vi.mocked(sendEmail)
const mockLogAudit = vi.mocked(logAudit)

const basePayload = {
  userId: "user-1",
  email: "candidate@example.com",
  name: "Test User",
  subject: "Interview Scheduled",
  body: "Your interview is at 10am.",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("sendNotification", () => {
  it("sends WhatsApp when phone is present and bridge is available", async () => {
    mockSendWhatsApp.mockResolvedValue({ success: true, messageId: "wa-1" })
    mockSendEmail.mockResolvedValue({ success: true, id: "email-1", provider: "resend" })

    const result = await sendNotification({ ...basePayload, phone: "+919876543210" })

    expect(mockSendWhatsApp).toHaveBeenCalledOnce()
    expect(mockSendWhatsApp).toHaveBeenCalledWith({
      phone: "+919876543210",
      body: basePayload.body,
    })
    expect(result.whatsapp?.success).toBe(true)
  })

  it("falls back to email-only when phone is missing", async () => {
    mockSendEmail.mockResolvedValue({ success: true, id: "email-2", provider: "resend" })

    const result = await sendNotification({ ...basePayload, phone: null })

    expect(mockSendWhatsApp).not.toHaveBeenCalled()
    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(result.channel).toBe("email")
    expect(result.whatsapp).toBeUndefined()
  })

  it("still sends email when WhatsApp fails", async () => {
    mockSendWhatsApp.mockResolvedValue({ success: false, error: "bridge timeout" })
    mockSendEmail.mockResolvedValue({ success: true, id: "email-3", provider: "resend" })

    const result = await sendNotification({ ...basePayload, phone: "+919876543210" })

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(result.email?.success).toBe(true)
    // WhatsApp was attempted but failed
    expect(result.whatsapp?.success).toBe(false)
  })

  it("sends both WhatsApp and email and reports channel as 'both' when both succeed", async () => {
    mockSendWhatsApp.mockResolvedValue({ success: true, messageId: "wa-2" })
    mockSendEmail.mockResolvedValue({ success: true, id: "email-4", provider: "resend" })

    const result = await sendNotification({ ...basePayload, phone: "+919876543210" })

    expect(mockSendWhatsApp).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(result.channel).toBe("both")
    expect(result.whatsapp?.success).toBe(true)
    expect(result.email?.success).toBe(true)
  })

  it("logs audit entry with correct action and channel info", async () => {
    mockSendWhatsApp.mockResolvedValue({ success: true, messageId: "wa-3" })
    mockSendEmail.mockResolvedValue({ success: true, id: "email-5", provider: "resend" })

    const result = await sendNotification({ ...basePayload, phone: "+919876543210" })

    expect(mockLogAudit).toHaveBeenCalledOnce()
    const [action, metadata, userId] = mockLogAudit.mock.calls[0]
    expect(action).toBe("notification.sent")
    expect(userId).toBe(basePayload.userId)
    expect(metadata).toMatchObject({ channel: result.channel })
  })

  it("uses html param for email when provided", async () => {
    mockSendEmail.mockResolvedValue({ success: true, id: "email-6", provider: "resend" })

    await sendNotification({ ...basePayload, phone: null, html: "<p>Rich content</p>" })

    const emailArgs = mockSendEmail.mock.calls[0][0]
    expect(emailArgs.html).toBe("<p>Rich content</p>")
  })

  it("wraps body in <p> for email html when no html param provided", async () => {
    mockSendEmail.mockResolvedValue({ success: true, id: "email-7", provider: "resend" })

    await sendNotification({ ...basePayload, phone: null })

    const emailArgs = mockSendEmail.mock.calls[0][0]
    expect(emailArgs.html).toBe(`<p>${basePayload.body}</p>`)
  })
})
