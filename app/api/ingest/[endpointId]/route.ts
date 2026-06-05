import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"
import {Client} from "@upstash/qstash";
import { getProvider } from "@/lib/providers/factory";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function POST(req: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {

  const { endpointId } = await params;
  try {

    const endpoint= await prisma.webhookEndpoint.findUnique({
      where: {id:endpointId},
    });

    if(!endpoint){
      return NextResponse.json({error: "Endpoint not found"}, {status: 404});
    }
    
    const body = await req.json();

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const provider= getProvider(endpoint.provider);
    const headers= Object.fromEntries(req.headers.entries());

    const isValid= await provider.verify(body, headers, endpoint.secret || "");

    if (!isValid) {
      console.warn(`Blocked unauthorized request from endpoint: ${endpointId}`);
      return NextResponse.json({ error: "Unauthorized: Invalid Signature" }, { status: 401 });
    }

    // Store the webhook event in the database
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        endpointId:endpointId,
        payload: body,
        headers: headers,
        status: "PENDING",
      }
    });

    await qstash.publishJSON({
      url: `${process.env.APP_URL}/api/worker`,
      body: {
      eventId: webhookEvent.id,
      },
    });

    console.log("Enqueued webhook event for processing:", webhookEvent.id);
    
    console.log("Received webhook:", body); 

    return NextResponse.json({ status: "accepted", id: webhookEvent.id }, { status: 200 });

  } catch (error) {
    // Handle JSON parsing errors or DB failures
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
