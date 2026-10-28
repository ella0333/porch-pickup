"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function ReviewForm({ orderId, name }: { orderId: string; name: string }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stars) return setError("Pick a star rating.");
        setBusy(true);
        try {
          await api(`/api/orders/${orderId}/review`, { stars, text });
          window.location.reload();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold">Review {name}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setStars(n)}
            className={`text-2xl ${n <= stars ? "text-amber-500" : "text-line"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="How did it go? (optional)" maxLength={500} />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>Post review</button>
    </form>
  );
}
