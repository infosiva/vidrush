"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Contract = {
  id: string;
  vendor: string;
  renewalDate: string;
  noticePeriodDays: number;
  cost: number | null;
};

type User = { id: string; email: string; unlocked: boolean };

function daysUntil(dateStr: string) {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function urgencyColor(days: number) {
  if (days < 7) return "border-red-500 bg-red-50";
  if (days < 30) return "border-amber-500 bg-amber-50";
  return "border-emerald-500 bg-emerald-50";
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (!meData.user) {
      router.push("/");
      return;
    }
    setUser(meData.user);

    const cRes = await fetch("/api/contracts");
    const cData = await cRes.json();
    setContracts(cData.contracts ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setParsing(true);
    try {
      const res = await fetch("/api/parse-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not parse");

      const createRes = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.parsed, rawText: text }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        if (createData.limitReached) setLimitReached(true);
        throw new Error(createData.error ?? "Could not save");
      }

      setContracts((prev) =>
        [...prev, createData.contract].sort(
          (a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()
        )
      );
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    setContracts((prev) => prev.filter((c) => c.id !== id));
    setLimitReached(false);
  }

  async function handleUpgrade() {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setError(data.error ?? "Payments not set up yet");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="font-black text-lg">
          Renewal<span className="text-blue-600">Pilot</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{user?.email}</span>
          {!user?.unlocked && (
            <button
              onClick={handleUpgrade}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Upgrade — $9
            </button>
          )}
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-700">
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <form onSubmit={handleParse} className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Paste contract text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Paste your vendor contract, lease, or insurance policy text here..."
            className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {limitReached && (
            <p className="mt-2 text-sm text-amber-700">
              You&apos;ve hit the 3-contract free limit.{" "}
              <button type="button" onClick={handleUpgrade} className="underline font-medium">
                Upgrade for unlimited
              </button>
            </p>
          )}
          <button
            type="submit"
            disabled={parsing || !text.trim()}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {parsing ? "Parsing..." : "Parse & add contract"}
          </button>
        </form>

        <h2 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Your contracts ({contracts.length}{!user?.unlocked ? "/3" : ""})
        </h2>

        {contracts.length === 0 ? (
          <p className="text-slate-400 text-sm">No contracts yet — paste one above to get started.</p>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => {
              const days = daysUntil(c.renewalDate);
              return (
                <div
                  key={c.id}
                  className={`flex items-center justify-between rounded-lg border-l-4 p-4 ${urgencyColor(days)}`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{c.vendor}</p>
                    <p className="text-sm text-slate-600">
                      Renews {new Date(c.renewalDate).toLocaleDateString()} ·{" "}
                      {days < 0 ? "overdue" : `${days} days`} · notice {c.noticePeriodDays}d
                      {c.cost ? ` · $${c.cost}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-slate-400 hover:text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
