"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { minuteLabel } from "@/lib/time";

type Initial = {
  address: string;
  instructions: string;
  dates: string[];
  startMinute: number;
  endMinute: number;
  timezone: string;
  payoutWallet: "PAYPAL" | "VENMO";
  payoutReceiver: string;
};

function nextDays(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`);
  }
  return out;
}

const HOURS = Array.from({ length: 25 }, (_, i) => i * 60);

export default function SetupForm({ initial }: { initial: Initial }) {
  const [address, setAddress] = useState(initial.address);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [dates, setDates] = useState<string[]>(initial.dates);
  const [startMinute, setStart] = useState(initial.startMinute);
  const [endMinute, setEnd] = useState(initial.endMinute);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [wallet, setWallet] = useState(initial.payoutWallet);
  const [receiver, setReceiver] = useState(initial.payoutReceiver);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!timezone) setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");
  }, [timezone]);

  const days = useMemo(() => nextDays(28), []);
  const toggle = (d: string) => setDates((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/setup", {
        address,
        instructions,
        dates,
        startMinute,
        endMinute,
        timezone,
        payoutWallet: wallet,
        payoutReceiver: receiver,
      });
      const next = new URLSearchParams(window.location.search).get("next") || "/sell";
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Where the item will be</h2>
        <div>
          <label className="label" htmlFor="address">Pickup address</label>
          <input
            className="field"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, state and zip"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="instructions">Where on the porch</label>
          <textarea
            className="field min-h-20"
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="On the bench to the left of the front door, under the blue tarp if it rains."
            required
          />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">When buyers can come</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="start">From</label>
            <select className="field" id="start" value={startMinute} onChange={(e) => setStart(Number(e.target.value))}>
              {HOURS.slice(0, 24).map((m) => (
                <option key={m} value={m}>{minuteLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="end">Until</label>
            <select className="field" id="end" value={endMinute} onChange={(e) => setEnd(Number(e.target.value))}>
              {HOURS.slice(1).map((m) => (
                <option key={m} value={m}>{m === 1440 ? "midnight" : minuteLabel(m)}</option>
              ))}
            </select>
          </div>
          <p className="pb-2 text-xs text-muted">Times are in {timezone || "your time zone"}.</p>
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="label mb-0">Pickup dates</span>
            <div className="flex gap-3 text-xs">
              <button type="button" className="text-brand" onClick={() => setDates(days.slice(0, 7))}>Next 7 days</button>
              <button type="button" className="text-brand" onClick={() => setDates(days)}>All 4 weeks</button>
              <button type="button" className="text-muted" onClick={() => setDates([])}>Clear</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {days.map((d) => {
              const [y, m, day] = d.split("-").map(Number);
              const label = new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              const on = dates.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggle(d)}
                  aria-pressed={on}
                  className={`rounded-lg border px-1 py-2 text-xs ${on ? "border-brand bg-brand-soft font-semibold text-brand-dark" : "border-line bg-card text-muted"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">How you get paid</h2>
        <div className="flex gap-2">
          {(["PAYPAL", "VENMO"] as const).map((w) => (
            <button
              type="button"
              key={w}
              onClick={() => setWallet(w)}
              aria-pressed={wallet === w}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${wallet === w ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-card"}`}
            >
              {w === "PAYPAL" ? "PayPal" : "Venmo"}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="receiver">
            {wallet === "PAYPAL" ? "PayPal email" : "Venmo phone number or @username"}
          </label>
          <input className="field" id="receiver" value={receiver} onChange={(e) => setReceiver(e.target.value)} required />
          <p className="mt-1 text-xs text-muted">You are paid as soon as the buyer confirms they picked the item up.</p>
        </div>
      </section>

      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={busy}>Save pickup setup</button>
    </form>
  );
}
