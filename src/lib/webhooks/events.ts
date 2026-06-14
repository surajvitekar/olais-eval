import * as crypto from "crypto"
import prisma from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { deliverWebhook } from "./delivery"
import type { WebhookEventType } from "@/types"

type EventPayload = Record<string, unknown>

function createSignature(secret: string, payload: Record<string, unknown>): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(JSON.stringify(payload))
  return hmac.digest("hex")
}

/**
 * Dispatch a webhook event to all active endpoints subscribed to this event type.
 * Creates WebhookEvent records for each matching endpoint and begins delivery.
 *
 * This should be called whenever a relevant action occurs in the application.
 */
export async function dispatchWebhookEvent(
  event: WebhookEventType,
  payload: EventPayload,
): Promise<void> {
  try {
    // Find all active endpoints subscribed to this event
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        isActive: true,
        events: { has: event },
      },
    })

    if (endpoints.length === 0) {
      return // No subscribers
    }

    // Create a webhook event record for each endpoint and trigger delivery
    const deliveryPromises = endpoints.map(async (endpoint) => {
      try {
        const webhookEvent = await prisma.webhookEvent.create({
          data: {
            endpointId: endpoint.id,
            event,
            payload: payload as Prisma.InputJsonValue,
            status: "PENDING",
          },
        })

        // Attempt immediate delivery
        await deliverWebhook(
          {
            url: endpoint.url,
            secret: endpoint.secret,
          },
          {
            id: webhookEvent.id,
            event: webhookEvent.event,
            payload: webhookEvent.payload,
          },
        )
      } catch (error) {
        console.error(
          `Failed to dispatch webhook event ${event} to endpoint ${endpoint.id}:`,
          error,
        )
      }
    })

    await Promise.allSettled(deliveryPromises)
  } catch (error) {
    console.error(`Failed to dispatch webhook event ${event}:`, error)
  }
}

/**
 * Send a test event to a specific endpoint.
 * Used for testing webhook configuration from the admin UI.
 */
export async function sendTestEvent(
  endpointId: string,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: endpointId },
    })

    if (!endpoint) {
      return { success: false, error: "Endpoint not found" }
    }

    const testPayload = {
      event: "test.ping",
      timestamp: new Date().toISOString(),
      message: "This is a test webhook from Olais Eval",
    }

    const signature = createSignature(endpoint.secret, testPayload)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": Math.floor(Date.now() / 1000).toString(),
          "X-Webhook-Event": "test.ping",
          "User-Agent": "OlaisEval-Webhook/1.0",
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Record the test event
      await prisma.webhookEvent.create({
        data: {
          endpointId: endpoint.id,
          event: "test.ping",
          payload: testPayload as Prisma.InputJsonValue,
          status: response.ok ? "DELIVERED" : "FAILED",
          responseCode: response.status,
          attempts: 1,
          deliveredAt: response.ok ? new Date() : null,
        },
      })

      if (response.ok) {
        return { success: true, statusCode: response.status }
      }

      return { success: false, statusCode: response.status, error: `HTTP ${response.status}` }
    } catch (fetchError) {
      clearTimeout(timeoutId)

      // Record the failed test
      await prisma.webhookEvent.create({
        data: {
          endpointId: endpoint.id,
          event: "test.ping",
          payload: testPayload as Prisma.InputJsonValue,
          status: "FAILED",
          attempts: 1,
        },
      })

      return { success: false, error: fetchError instanceof Error ? fetchError.message : "Request failed" }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
