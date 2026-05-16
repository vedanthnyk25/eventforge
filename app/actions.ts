"use server";

import prisma from "@/lib/prisma";
import { Client } from "@upstash/qstash";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

const qstash= new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function replayWebhook(eventId: string) {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
      });
    
    if (!event) {
      throw new Error("Event not found");
    }

    if(event.status === "DELIVERED") {
      return { success: false, error: "Event already delivered successfully" };
    }
    
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const workerUrl = `${protocol}://${host}/api/worker`;

    await qstash.publishJSON({
      url: workerUrl,
      body: { eventId: event.id },
    });
    
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: "PENDING" },
    });

    revalidatePath(`/dashboard/event/${eventId}`);
    revalidatePath(`/dashboard/${event.endpointId}`);

    return { success: true }; 
  }
  catch (error) {
    console.error("Error enqueuing replay:", error);
    return { success: false, error: "Failed to enqueue replay" };
  }
}
