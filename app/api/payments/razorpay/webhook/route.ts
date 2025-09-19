import { NextRequest, NextResponse } from "next/server";

import { handleRazorpayWebhook } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await handleRazorpayWebhook(payload, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
