import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createStripeCheckoutSession } from "@/lib/payments";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const priceId = body?.priceId as string | undefined;

  if (!priceId) {
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await createStripeCheckoutSession({
      userId: session.user.id,
      priceId,
      successUrl: `${origin}/account?status=success`,
      cancelUrl: `${origin}/pricing?status=cancelled`,
      email: session.user.email
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
