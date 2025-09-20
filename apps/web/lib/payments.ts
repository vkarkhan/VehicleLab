import Stripe from "stripe";
import Razorpay from "razorpay";

import { prisma } from "@/lib/prisma";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2024-06-20";

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

export async function ensureStripeCustomer(userId: string, email?: string | null) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("User not found");

  if (existing.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({ email: email ?? undefined, metadata: { userId } });

  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });

  return customer.id;
}

interface CheckoutSessionInput {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  email?: string | null;
}

export async function createStripeCheckoutSession({ userId, priceId, successUrl, cancelUrl, email }: CheckoutSessionInput) {
  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId }
  });

  return session;
}

function mapStripePriceToPlan(priceId?: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "PRO_MONTHLY" as const;
  if (priceId === process.env.STRIPE_PRICE_PRO_YEARLY) return "PRO_YEARLY" as const;
  if (priceId === process.env.STRIPE_PRICE_LIFETIME) return "LIFETIME" as const;
  return null;
}

async function upsertEntitlement({
  userId,
  plan,
  status,
  currentPeriodEnd
}: {
  userId: string;
  plan: "PRO_MONTHLY" | "PRO_YEARLY" | "LIFETIME";
  status: "active" | "canceled";
  currentPeriodEnd?: Date | null;
}) {
  await prisma.entitlement.upsert({
    where: {
      userId_plan: {
        userId,
        plan
      }
    },
    update: {
      status,
      currentPeriodEnd: currentPeriodEnd ?? null
    },
    create: {
      userId,
      plan,
      status,
      currentPeriodEnd: currentPeriodEnd ?? null
    }
  });
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  if (!event.type.startsWith("customer") && !event.type.startsWith("checkout") && !event.type.startsWith("invoice")) {
    return;
  }

  const stripe = getStripeClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.metadata && session.metadata.userId) || null;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!userId || !customerId) return;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = mapStripePriceToPlan(priceId);
        if (plan) {
          await upsertEntitlement({
            userId,
            plan,
            status: subscription.status === "canceled" ? "canceled" : "active",
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
          });
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      if (!customerId) return;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (!user) return;
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = mapStripePriceToPlan(priceId);
      if (!plan) return;
      await upsertEntitlement({
        userId: user.id,
        plan,
        status: subscription.status === "canceled" ? "canceled" : "active",
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
      });
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) {
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) return;
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        const priceId = invoice.lines.data[0]?.price?.id;
        const plan = mapStripePriceToPlan(priceId);
        if (user && plan) {
          await upsertEntitlement({ userId: user.id, plan, status: "active" });
        }
      }
      break;
    }
    default:
      break;
  }
}


function mapRazorpayPlan(plan: string) {
  if (plan === 'PRO_MONTHLY') return process.env.RAZORPAY_PLAN_PRO_MONTHLY || null;
  if (plan === 'PRO_YEARLY') return process.env.RAZORPAY_PLAN_PRO_YEARLY || null;
  return null;
}

function mapRazorpayPlanIdToPlan(planId?: string | null) {
  if (!planId) return null;
  if (planId === process.env.RAZORPAY_PLAN_PRO_MONTHLY) return 'PRO_MONTHLY' as const;
  if (planId === process.env.RAZORPAY_PLAN_PRO_YEARLY) return 'PRO_YEARLY' as const;
  return null;
}

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay keys missing');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createRazorpaySubscription({ userId, plan, email }: { userId: string; plan: 'PRO_MONTHLY' | 'PRO_YEARLY'; email?: string | null; }) {
  const razorpay = getRazorpayClient();
  const planId = mapRazorpayPlan(plan);
  if (!planId) {
    throw new Error('Unknown Razorpay plan');
  }
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    notes: { userId }
  });
  await prisma.user.update({ where: { id: userId }, data: { razorpayCustomerId: subscription.customer_id ?? null } });
  return subscription;
}

export async function handleRazorpayWebhook(payload: any, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET missing');
  const razorpay = getRazorpayClient();
  const body = JSON.stringify(payload);
  const crypto = await import('node:crypto');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (expected !== signature) {
    throw new Error('Invalid Razorpay signature');
  }
  const event = payload?.event as string | undefined;
  if (!event) return;
  if (event === 'subscription.activated' || event === 'subscription.charged' || event === 'subscription.updated') {
    const subscription = payload.payload?.subscription?.entity;
    if (!subscription) return;
    const planId = subscription.plan_id as string | undefined;
    const plan = mapRazorpayPlanIdToPlan(planId);
    const customerId = subscription.customer_id as string | undefined;
    if (!plan || !customerId) return;
    const user = await prisma.user.findFirst({ where: { razorpayCustomerId: customerId } });
    if (!user) return;
    await upsertEntitlement({
      userId: user.id,
      plan,
      status: subscription.status === 'cancelled' ? 'canceled' : 'active',
      currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null
    });
  }
}
