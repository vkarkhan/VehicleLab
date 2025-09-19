import { headers } from "next/headers";

import { getCurrencyForCountry, type Currency } from "@/lib/currency";

export function detectCountry() {
  const hdrs = headers();
  return hdrs.get("x-vercel-ip-country") ?? hdrs.get("cf-ipcountry") ?? undefined;
}

export function detectCurrency(fallback?: Currency): Currency {
  const country = detectCountry();
  return getCurrencyForCountry(country, fallback);
}
