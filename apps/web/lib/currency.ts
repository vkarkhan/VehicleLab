export type Currency = "USD" | "INR";

const countryToCurrency: Record<string, Currency> = {
  IN: "INR"
};

export function getCurrencyForCountry(countryCode?: string, fallback: Currency = "USD"): Currency {
  if (!countryCode) return fallback;
  return countryToCurrency[countryCode.toUpperCase()] ?? fallback;
}

export function formatCurrency(amount: number, currency: Currency) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2
  }).format(amount);
}
