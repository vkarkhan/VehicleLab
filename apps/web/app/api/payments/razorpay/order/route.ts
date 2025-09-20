import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createRazorpaySubscription } from "@/lib/payments";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan = body?.plan as "PRO_MONTHLY" | "PRO_YEARLY" | undefined;

  if (!plan) {
    return NextResponse.json({ error: "Missing plan" }, { status: 400 });
  }

  try {
    const subscription = await createRazorpaySubscription({ userId: session.user.id, plan, email: session.user.email });
    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      short_url: subscription.short_url,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay order error", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
