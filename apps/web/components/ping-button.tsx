"use client";

import { useState } from "react";

type PingResponse = {
  ok: boolean;
  time?: string;
  [key: string]: unknown;
};

export function PingButton() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ping");

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as PingResponse;
      setResponse(data);
    } catch (err) {
      setResponse(null);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Check the API wiring</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Trigger the <code className="rounded bg-slate-200 px-1 text-xs font-semibold dark:bg-slate-800">/api/ping</code> route
          to verify the Next.js app router handlers are responding locally.
        </p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950"
      >
        {loading ? "Pinging..." : "Call /api/ping"}
      </button>
      {response ? (
        <pre className="max-h-48 overflow-auto rounded-xl bg-slate-950/90 p-4 text-xs text-slate-100 dark:bg-slate-900/80">
          {JSON.stringify(response, null, 2)}
        </pre>
      ) : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
