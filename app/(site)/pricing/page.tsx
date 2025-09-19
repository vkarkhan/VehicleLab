import type { Metadata } from "next";

import { PricingPlans } from "@/components/PricingPlans";
import type { Currency } from "@/lib/currency";
import { detectCurrency } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare the Free and Pro plans for VehicleLab."
};

function resolveCurrency(value?: string | null): Currency {
  return value === "INR" ? "INR" : "USD";
}

export default function PricingPage() {
  const defaultCurrency = resolveCurrency(process.env.DEFAULT_CURRENCY);
  const detectedCurrency = detectCurrency(defaultCurrency);
  const initialCurrency = detectedCurrency ?? defaultCurrency;

  const stripePrices = {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? null,
    lifetime: process.env.STRIPE_PRICE_LIFETIME ?? null
  };

  const razorpayPlans = {
    monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY ?? null,
    yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY ?? null
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Pricing</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          VehicleLab starts free so you can explore the 3D sandbox, study telemetry, and share watermarked exports. Upgrade to Pro
          when you need deeper suspension tuning, watermark-free exports, and synced presets across your team.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Plans are billed via Stripe for USD/global customers and Razorpay for INR. Taxes are calculated at checkout, and you can
          switch currencies using the selector below.
        </p>
      </div>

      <div className="mt-12">
        <PricingPlans initialCurrency={initialCurrency} stripePrices={stripePrices} razorpayPlans={razorpayPlans} />
      </div>

      <div className="mt-16 grid gap-8 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What&apos;s included with Pro?</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Advanced suspension controls (camber, spring, damper, anti-roll) with beta flagging for rapid iteration.</li>
            <li>Watermark-free PNG exports, premium preset library, and the forthcoming PDF report builder.</li>
            <li>Priority roadmap input and access to experimental vehicles as they ship.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Need purchase documentation?</h2>
          <p className="mt-2">
            Stripe customers receive invoices automatically via email and can manage billing from the Account page. Razorpay
            customers receive payment confirmations and can contact support for GST-compliant invoices in India.
          </p>
        </div>
      </div>
    </div>
  );
}
