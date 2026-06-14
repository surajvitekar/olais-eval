import * as crypto from "crypto"
import prisma from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

const MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 5_000 // 5 seconds

/**
 * Sign a payload using HMAC-SHA256 and the endpoint's secret.
 * Returns the hex-encoded signature.
 */
export function signPayload(secret: string, payload: Record<string, unknown>): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(JSON.stringify(payload))
  return hmac.digest("hex")
}

/**
 * Calculate the delay in milliseconds for a given retry attempt
 * using exponential backoff: baseDelay * 2^(attempt-1)
 */
export function getRetryDelay(attempt: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
}

/**
 * Deliver a webhook event to its endpoint.
 * Handles HMAC signing, retry logic, and status tracking.
 */
export async function deliverWebhook(
  endpoint: { url: string; secret: string },
  event: {
    id: string
    event: string
    payload: Prisma.JsonValue
  },
): Promise<void> {
  const payload = event.payload as Record<string, unknown>

  // Build the signed payload
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signedPayload = {
    ...payload,
    event: event.event,
    timestamp,
  }

  const signature = signPayload(endpoint.secret, signedPayload)

  let attempt = 0
  let lastError: Error | null = null

  while (attempt < MAX_RETRIES) {
    attempt++
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10_000) // 10s timeout

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": timestamp,
          "X-Webhook-Event": event.event,
          "User-Agent": "OlaisEval-Webhook/1.0",
        },
        body: JSON.stringify(signedPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseCode = response.status

      if (response.ok) {
        // Success — mark as delivered
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: "DELIVERED",
            responseCode,
            attempts: attempt,
            deliveredAt: new Date(),
            nextRetryAt: null,
          },
        })
        return
      }

      // Non-2xx response
      lastError = new Error(`HTTP ${responseCode}: ${response.statusText}`)

      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          responseCode,
          attempts: attempt,
        },
      })

      // Retry if we have attempts left
      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(attempt)
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            nextRetryAt: new Date(Date.now() + delay),
          },
        })
        await sleep(delay)
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Update attempt count
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          attempts: attempt,
        },
      })

      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(attempt)
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            nextRetryAt: new Date(Date.now() + delay),
          },
        })
        await sleep(delay)
      }
    }
  }

  // All attempts exhausted — mark as failed
  await prisma.webhookEvent.update({
    where: { id: event.id },
    data: {
      status: "FAILED",
      nextRetryAt: null,
    },
  })

  console.error(
    `Webhook delivery failed for event ${event.id} after ${MAX_RETRIES} attempts:`,
    lastError?.message,
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Process a pending webhook event (used for retries from background jobs).
 */
export async function processWebhookEvent(eventId: string): Promise<void> {
  const webhookEvent = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
    include: { endpoint: true },
  })

  if (!webhookEvent) {
    console.error(`Webhook event ${eventId} not found`)
    return
  }

  if (!webhookEvent.endpoint.isActive) {
    // Endpoint is disabled, skip delivery
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: "FAILED", nextRetryAt: null },
    })
    return
  }

  await deliverWebhook(
    {
      url: webhookEvent.endpoint.url,
      secret: webhookEvent.endpoint.secret,
    },
    {
      id: webhookEvent.id,
      event: webhookEvent.event,
      payload: webhookEvent.payload,
    },
  )
}
