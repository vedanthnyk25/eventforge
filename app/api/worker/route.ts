import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { Receiver } from "@upstash/qstash";
import { z } from "zod";

const workerBodySchema = z.object({
  eventId: z.string().uuid("eventId must be a valid UUID"),
});

// QStash Receiver verifies that this request genuinely came from Upstash
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(request: NextRequest) {

  const rawBody = await request.text();

  const isValid = await receiver.verify({
    signature: request.headers.get("upstash-signature") ?? "",
    body: rawBody,
  }).catch(() => false); // verify() throws on failure; we convert to false

  if (!isValid) {
    console.warn("Worker received request with invalid QStash signature — rejected.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedBody: { eventId: string };
  try {
    const json = JSON.parse(rawBody);
    const result = workerBodySchema.safeParse(json);

    if (!result.success) {
      console.warn("Worker received invalid body:", result.error.issues);
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.issues },
        { status: 400 }
      );
    }
    parsedBody = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { eventId } = parsedBody;

  try {
    const webhookEvent = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
      include: { endpoint: true },
    });

    if (!webhookEvent || !webhookEvent.endpoint) {
      return NextResponse.json(
        { error: "Webhook event or endpoint not found" },
        { status: 404 }
      );
    }

    const DESTINATION_URL = webhookEvent.endpoint.targetUrl;

    let responseStatus = 0;
    let responseBody = "";
    const start = Date.now();

    try {
      const res = await fetch(DESTINATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event-ID": webhookEvent.id,
        },
        body: JSON.stringify(webhookEvent.payload),
      });

      responseStatus = res.status;
      responseBody = await res.text();
      console.log(`Delivery to ${DESTINATION_URL} → HTTP ${responseStatus}`);
    } catch (fetchError) {
      console.error("Network error delivering webhook:", fetchError);
      responseStatus = 500;
      responseBody = String(fetchError);
    }

    const duration = Date.now() - start;

    // Log the attempt and update status
    await prisma.deliveryAttempt.create({
      data: {
        webhookEventId: webhookEvent.id,
        responseStatus,
        responseBody: responseBody.slice(0, 2000),
      },
    });

    const isSuccess = responseStatus >= 200 && responseStatus < 300;

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: isSuccess ? "DELIVERED" : "FAILED" },
    });

    if (isSuccess) {
      console.log(`Event ${webhookEvent.id} delivered in ${duration}ms`);
      return NextResponse.json({ message: "Delivered successfully" }, { status: 200 });
    } else {
      // Return 500 to signal QStash to retry
      console.warn(`Event ${webhookEvent.id} delivery failed (HTTP ${responseStatus})`);
      return NextResponse.json({ error: "Delivery failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("Unexpected worker error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
