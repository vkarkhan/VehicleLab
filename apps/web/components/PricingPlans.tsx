"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PriceTable } from "@/components/PriceTable";
import type { Currency } from "@/lib/currency";

interface PricingPlansProps {
  initialCurrency: Currency;
  stripePrices: {
    monthly?: string | null;
    yearly?: string | null;
    lifetime?: string | null;
  };
  razorpayPlans: {
    monthly?: string | null;
    yearly?: string | null;
  };
}

const supportedCurrencies: Currency[] = ["USD", "INR"];

export function PricingPlans({ initialCurrency, stripePrices, razorpayPlans }: PricingPlansProps) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stripeEnabled = Boolean(stripePrices.monthly && stripePrices.yearly);
  const razorpayEnabled = Boolean(razorpayPlans.monthly && razorpayPlans.yearly);

  const canCheckout = useMemo(() => {
    if (currency === "USD") return stripeEnabled;
    return razorpayEnabled;
  }, [currency, razorpayEnabled, stripeEnabled]);

  const lifetimeEnabled = currency === "USD" && Boolean(stripePrices.lifetime);

  async function handleCheckout(plan: "monthly" | "yearly" | "lifetime") {
    setMessage(null);
    if (plan === "lifetime" && !lifetimeEnabled) {
      setMessage("Lifetime purchase is currently available in USD only.");
      return;
    }

    if (!canCheckout && plan !== "lifetime") {
      setMessage("Payment configuration is incomplete.");
      return;
    }

    setLoading(true);
    try {
      if (currency === "USD") {
        const priceId =
          plan === "monthly"
            ? stripePrices.monthly
            : plan === "yearly"
              ? stripePrices.yearly
              : stripePrices.lifetime;

        if (!priceId) {
          setMessage("Stripe price ID missing for this plan.");
        } else {
          const response = await fetch("/api/payments/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceId })
          });
          const data = await response.json();
          if (response.ok && data?.url) {
            window.location.href = data.url as string;
            return;
          }
          setMessage(data?.error ?? "Unable to start Stripe checkout.");
        }
      } else {
        if (plan === "lifetime") {
          setMessage("Lifetime purchase is currently available in USD only.");
        } else {
          const response = await fetch("/api/payments/razorpay/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: plan === "monthly" ? "PRO_MONTHLY" : "PRO_YEARLY" })
          });
          const data = await response.json();
          if (response.ok && (data?.short_url || data?.id)) {
            const redirectUrl = data.short_url ?? `https://dashboard.razorpay.com/app/subscriptions/${data.id}`;
            window.location.href = redirectUrl as string;
            return;
          }
          setMessage(data?.error ?? "Unable to start Razorpay order.");
        }
      }
    } catch (error) {
      console.error(error);
      setMessage("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Choose your region</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Automatic detection uses your IP country. Override below to preview other pricing.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {supportedCurrencies.map((option) => (
            <Button
              key={option}
              variant={currency === option ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setCurrency(option);
                setMessage(null);
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      {!canCheckout && currency !== "USD" && (
        <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-100/40 p-4 text-sm text-amber-700 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-200">
          Payment keys for the selected currency are not configured. Visitors will see the Free tier only until the environment
          variables are supplied.
        </div>
      )}

      {currency === "USD" && !stripeEnabled && (
        <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-100/40 p-4 text-sm text-amber-700 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-200">
          Stripe price IDs are missing. Configure monthly and yearly Pro prices to enable checkout.
        </div>
      )}

      <PriceTable
        currency={currency}
        onCheckout={(plan) => handleCheckout(plan)}
        onLifetime={lifetimeEnabled ? () => handleCheckout("lifetime") : undefined}
        loading={loading}
      />

      {lifetimeEnabled && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Lifetime purchases are processed via Stripe and include access to all future VehicleLab updates.
        </p>
      )}

      {message && (
        <div className="rounded-3xl border border-rose-300 bg-rose-100/60 p-4 text-sm text-rose-700 dark:border-rose-500 dark:bg-rose-500/10 dark:text-rose-200">
          {message}
        </div>
      )}
    </div>
  );
}
