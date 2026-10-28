"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function OwnerControls({ listingId, title, priceCents }: { listingId: string; title: string; priceCents: number }) {
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title);
  const [price, setPrice] = useState(String(priceCents / 100));
  const [error, setError] = useState("");

  async function save(body: unknown, then: () => void) {
    setError("");
    try {
      await api(`/api/listings/${listingId}`, body, "PATCH");
      then();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">This is your listing. Buyers see a buy button here.</p>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-danger flex-1" onClick={() => save({ remove: true }, () => (window.location.href = "/orders"))}>
            Remove
          </button>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save({ title: t, priceCents: Math.round(Number(price) * 100) }, () => window.location.reload());
      }}
    >
      <div>
        <label className="label" htmlFor="t">Title</label>
        <input id="t" className="field" value={t} onChange={(e) => setT(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p">Price ($)</label>
        <input id="p" className="field" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1">Save</button>
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>
  );
}
