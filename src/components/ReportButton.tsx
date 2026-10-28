"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function ReportButton({ listingId, userId }: { listingId?: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (done) return <p className="px-1 text-xs text-muted">Thanks. An admin will look at your report.</p>;
  if (!open) {
    return (
      <button className="px-1 text-xs text-muted underline" onClick={() => setOpen(true)}>
        Report {listingId ? "this listing" : "this user"}
      </button>
    );
  }
  return (
    <form
      className="card space-y-2 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("/api/reports", { listingId, userId, reason });
          setDone(true);
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <label className="label" htmlFor="reason">What's wrong?</label>
      <textarea id="reason" className="field min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} />
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-danger">Send report</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
