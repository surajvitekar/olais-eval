export interface WhatsAppMessage {
  phone: string  // E.164 format or local number
  body: string   // Message text
}

export interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a WhatsApp message via the external bridge API.
 *
 * The bridge URL is read from WHATSAPP_BRIDGE_URL. If that env var is not set,
 * the function resolves to an error result without throwing.
 *
 * POST to WHATSAPP_BRIDGE_URL with { phone, body }.
 * Expects response JSON: { success: boolean, messageId?: string }
 * Times out after 10 seconds.
 */
export async function sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL
  if (!bridgeUrl) {
    return { success: false, error: "WHATSAPP_BRIDGE_URL not configured" }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: message.phone, body: message.body }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Bridge responded with HTTP ${response.status}`,
      }
    }

    const data = (await response.json()) as { success: boolean; messageId?: string }
    if (!data.success) {
      return { success: false, error: "Bridge returned success=false" }
    }

    return { success: true, messageId: data.messageId }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error contacting WhatsApp bridge"
    return { success: false, error: message }
  } finally {
    clearTimeout(timeoutId)
  }
}
