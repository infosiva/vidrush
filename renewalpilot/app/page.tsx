"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromoBar from "@/components/PromoBar";

type ParsedContract = {
  vendor: string;
  renewalDate: string;
  noticePeriodDays: number;
  cost: number | null;
};

const SAMPLE = `Acme Cloud Storage Agreement — Effective Jan 1, 2026. Annual subscription, $1,200/year, auto-renews unless cancelled with 30 days written notice before the renewal date of 2026-09-15.`;

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ParsedContract | null>(null);

  const [mode, setMode] = useState<"login" | "signup" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  async function handleTry(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setParsing(true);
    try {
      const res = await fetch("/api/parse-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text || SAMPLE }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not parse");
      setResult(data.parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push("/dashboard");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="font-black text-lg text-slate-900">
          Renewal<span className="text-blue-600">Pilot</span>
        </div>
        <button
          onClick={() => setMode("login")}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Log in
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14 grid gap-12 lg:grid-cols-2 lg:items-start">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
            Never miss a contract renewal again
          </h1>
          <p className="mt-4 text-slate-600 text-lg">
            Paste any vendor contract, lease, or insurance policy. We extract the renewal date,
            notice period, and cost — then track it for you so you never get auto-renewed by
            surprise.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            <li>✓ Works with any contract text — no integrations required</li>
            <li>✓ Dashboard sorted by urgency, color-coded</li>
            <li>✓ 3 contracts free, $9 one-time to unlock unlimited</li>
          </ul>

          {mode && (
            <form onSubmit={handleAuth} className="mt-8 rounded-xl border border-slate-200 p-5 max-w-sm">
              <div className="flex gap-4 mb-4 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={mode === "login" ? "text-blue-600" : "text-slate-400"}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={mode === "signup" ? "text-blue-600" : "text-slate-400"}
                >
                  Sign up
                </button>
              </div>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm mb-3 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Password (8+ chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm mb-3 focus:border-blue-500 focus:outline-none"
              />
              {authError && <p className="text-sm text-red-600 mb-3">{authError}</p>}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {authLoading ? "..." : mode === "login" ? "Log in" : "Create account"}
              </button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-700 mb-2">Try it now — paste contract text</p>
          <form onSubmit={handleTry}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={SAMPLE}
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm focus:border-blue-500 focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={parsing}
              className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {parsing ? "Parsing..." : "Parse contract"}
            </button>
          </form>

          <PromoBar />

          {result && (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-slate-900 mb-1">{result.vendor}</p>
              <p className="text-slate-600">
                Renews {new Date(result.renewalDate).toLocaleDateString()} · notice{" "}
                {result.noticePeriodDays}d{result.cost ? ` · $${result.cost}` : ""}
              </p>
              <button
                onClick={() => setMode("signup")}
                className="mt-3 text-blue-600 font-medium underline"
              >
                Sign up free to save this →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
