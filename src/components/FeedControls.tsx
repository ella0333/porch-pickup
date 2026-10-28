"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { CATEGORIES } from "@/lib/format";

export default function FeedControls({ placeLabel }: { placeLabel: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`/?${next.toString()}`);
  }

  function useMyLocation() {
    setError("");
    if (!navigator.geolocation) return setError("Your browser can't share location. Enter a zip code instead.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        update({
          lat: pos.coords.latitude.toFixed(3),
          lng: pos.coords.longitude.toFixed(3),
          place: "your location",
        });
      },
      () => {
        setBusy(false);
        setError("Location was blocked. Enter a zip code instead.");
      },
      { timeout: 10000 },
    );
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!zip.trim()) return;
    setBusy(true);
    setError("");
    try {
      const hit = await api<{ lat: number; lng: number }>(`/api/geocode?q=${encodeURIComponent(zip)}`, undefined, "GET");
      update({ lat: String(hit.lat), lng: String(hit.lng), place: zip.trim() });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const view = params.get("view") === "map" ? "map" : "grid";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted">
          {placeLabel ? <>Sorted by distance from <span className="font-medium text-ink">{placeLabel}</span></> : "Showing newest first"}
        </p>
        <button className="btn-ghost py-2" onClick={useMyLocation} disabled={busy}>Use my location</button>
        <form onSubmit={lookup} className="flex gap-2">
          <input className="field w-32" placeholder="Zip code" value={zip} onChange={(e) => setZip(e.target.value)} aria-label="Zip code" />
          <button className="btn-ghost py-2" disabled={busy}>Go</button>
        </form>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: String(new FormData(e.currentTarget).get("q") || "") });
          }}
        >
          <input className="field min-w-0 flex-1" name="q" placeholder="Search listings" defaultValue={params.get("q") ?? ""} aria-label="Search listings" />
        </form>
        <select className="field w-auto" value={params.get("cat") ?? ""} onChange={(e) => update({ cat: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="field w-auto" value={params.get("max") ?? ""} onChange={(e) => update({ max: e.target.value })} aria-label="Maximum price">
          <option value="">Any price</option>
          {[10, 25, 50, 100, 250, 500].map((p) => <option key={p} value={p}>Under ${p}</option>)}
        </select>
        <select className="field w-auto" value={params.get("dist") ?? ""} onChange={(e) => update({ dist: e.target.value })} aria-label="Maximum distance">
          <option value="">Any distance</option>
          {[1, 3, 5, 10, 25].map((d) => <option key={d} value={d}>Within {d} mi</option>)}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-line">
          {(["grid", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => update({ view: v === "grid" ? null : v })}
              className={`px-3 py-2 text-sm ${view === v ? "bg-ink text-white" : "bg-card"}`}
            >
              {v === "grid" ? "Grid" : "Map"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
