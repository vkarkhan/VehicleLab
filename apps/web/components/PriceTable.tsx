"use client";

import { useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Currency } from "@/lib/currency";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "yearly";

interface PriceTableProps {
  currency: Currency;
  onCheckout: (plan: BillingInterval) => void;
  onLifetime?: () => void;
  loading?: boolean;
}

const pricingCopy: Record<Currency, { monthly: number; yearly: number; lifetime?: number }> = {
  USD: { monthly: 39, yearly: 399, lifetime: 899 },
  INR: { monthly: 1499, yearly: 14999 }
};

const freeFeatures = [
  "Full sandbox access with real-time physics",
  "Telemetry overlays, charts, and CSV export",
  "PNG snapshots with VehicleLab watermark"
];

const proFeatures = [
  "Watermark-free PNG and PDF report export (beta)",
  "Advanced suspension tuning (camber, spring, damper, ARB)",
  "Preset library sync and multi-device entitlements",
  "Priority support and early access experiments"
];

const lifetimeExtras = [
  "Perpetual Pro entitlement for one account",
  "Founders badge inside the sandbox UI",
  "Early previews of upcoming vehicles and tracks"
];

const intervalLabels: Record<BillingInterval, string> = {
  monthly: "per month",
  yearly: "per year"
};

export function PriceTable({ currency, onCheckout, onLifetime, loading = false }: PriceTableProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const pricing = pricingCopy[currency] ?? pricingCopy.USD;
  const priceLabel = useMemo(() => intervalLabels[interval], [interval]);
  const showLifetime = currency === "USD" && Boolean(pricing.lifetime && onLifetime);

  const monthlyEquivalent = useMemo(() => {
    if (interval !== "yearly") return null;
    const amount = pricing.yearly / 12;
    return formatCurrency(amount, currency);
  }, [currency, interval, pricing.yearly]);

  return (
    <div className={cn("grid gap-6", showLifetime ? "lg:grid-cols-3" : "lg:grid-cols-2")}> 
      <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Free</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Ideal for exploring the sandbox and sharing quick experiments.
            </p>
          </div>
        </div>
        <p className="mt-6 text-3xl font-semibold text-slate-900 dark:text-white">
          {currency === "INR" ? "₹0" : "$0"}
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <a href="/vehicellab">Launch sandbox</a>
        </Button>
        <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          {freeFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 text-brand-500" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-col overflow-hidden rounded-3xl border border-brand-400 bg-gradient-to-br from-brand-500/10 via-white to-white p-8 shadow-lg dark:border-brand-500/40 dark:from-brand-400/10 dark:via-slate-900 dark:to-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-300">
              <Sparkles className="h-4 w-4" aria-hidden />
              Most popular
            </div>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Pro</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Unlock advanced suspension tuning, premium exports, and shared presets.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-brand-200 bg-white p-1 text-xs font-medium dark:border-brand-400/40 dark:bg-slate-900">
            {(["monthly", "yearly"] as BillingInterval[]).map((option) => (
              <Button
                key={option}
                variant={interval === option ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs",
                  interval === option
                    ? "bg-brand-500 text-white hover:bg-brand-500 dark:bg-brand-500 dark:text-white"
                    : "text-slate-600 dark:text-slate-200"
                )}
                onClick={() => setInterval(option)}
              >
                <span className="capitalize">{option}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-4xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(pricing[interval], currency)}
            <span className="ml-1 text-base font-normal text-slate-600 dark:text-slate-300"> {priceLabel}</span>
          </p>
          {monthlyEquivalent && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">That's {monthlyEquivalent} billed annually.</p>
          )}
        </div>

        <Button
          className="mt-6"
          size="lg"
          disabled={loading}
          onClick={() => onCheckout(interval)}
        >
          {loading ? "Preparing checkout…" : "Upgrade to Pro"}
        </Button>

        <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          {proFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 text-brand-500" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {showLifetime && pricing.lifetime && onLifetime && (
        <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Lifetime</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              One-time payment for perpetual Pro access with future updates included.
            </p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(pricing.lifetime, currency)}
          </p>
          <Button className="mt-6" variant="outline" disabled={loading} onClick={onLifetime}>
            {loading ? "Preparing checkout…" : "Purchase lifetime"}
          </Button>
          <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {lifetimeExtras.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 text-brand-500" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
