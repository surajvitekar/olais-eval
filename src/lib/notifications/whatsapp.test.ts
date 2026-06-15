import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { sendWhatsApp } from "./whatsapp"

describe("sendWhatsApp", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it("returns error result when WHATSAPP_BRIDGE_URL is not set, without throwing", async () => {
    delete process.env.WHATSAPP_BRIDGE_URL

    const result = await sendWhatsApp({ phone: "+919876543210", body: "Hello" })

    expect(result.success).toBe(false)
    expect(result.error).toBe("WHATSAPP_BRIDGE_URL not configured")
    expect(result.messageId).toBeUndefined()
  })

  it("calls the bridge URL with correct phone and body when configured", async () => {
    process.env.WHATSAPP_BRIDGE_URL = "https://bridge.example.com/send"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, messageId: "msg-123" }),
    })
    vi.stubGlobal("fetch", mockFetch)

    await sendWhatsApp({ phone: "+919876543210", body: "Test message" })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("https://bridge.example.com/send")
    expect(options.method).toBe("POST")
    const body = JSON.parse(options.body)
    expect(body.phone).toBe("+919876543210")
    expect(body.body).toBe("Test message")
  })

  it("returns success result when bridge responds 200 with { success: true }", async () => {
    process.env.WHATSAPP_BRIDGE_URL = "https://bridge.example.com/send"

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, messageId: "msg-abc" }),
    }))

    const result = await sendWhatsApp({ phone: "+919876543210", body: "Hello" })

    expect(result.success).toBe(true)
    expect(result.messageId).toBe("msg-abc")
    expect(result.error).toBeUndefined()
  })

  it("returns error result when bridge responds non-200", async () => {
    process.env.WHATSAPP_BRIDGE_URL = "https://bridge.example.com/send"

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ success: false }),
    }))

    const result = await sendWhatsApp({ phone: "+919876543210", body: "Hello" })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.messageId).toBeUndefined()
  })

  it("returns error result when request times out", async () => {
    process.env.WHATSAPP_BRIDGE_URL = "https://bridge.example.com/send"

    // Simulate a fetch that rejects with an AbortError (timeout)
    const abortError = new DOMException("The operation was aborted", "AbortError")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError))

    const result = await sendWhatsApp({ phone: "+919876543210", body: "Hello" })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
