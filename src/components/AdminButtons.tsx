"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Props = { kind: "dispute" | "report" | "unban"; id: string; userId?: string; listingId?: string };

export default function AdminButtons({ kind, id, userId, listingId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin", body);
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {kind === "dispute" && (
        <>
          <input className="field" placeholder="Note for the record (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => run({ action: "resolve", orderId: id, outcome: "release", note })}>
              Pay the seller
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => run({ action: "resolve", orderId: id, outcome: "refund", note })}>
              Release the buyer's hold
            </button>
          </div>
        </>
      )}
      {kind === "report" && (
        <div className="flex flex-wrap gap-2">
          {userId && (
            <button className="btn-danger" disabled={busy} onClick={() => run({ action: "ban", userId, banned: true })}>Ban user</button>
          )}
          {listingId && (
            <button className="btn-ghost" disabled={busy} onClick={() => run({ action: "removeListing", listingId })}>Remove listing</button>
          )}
          <button className="btn-ghost" disabled={busy} onClick={() => run({ action: "closeReport", reportId: id })}>Close report</button>
        </div>
      )}
      {kind === "unban" && (
        <button className="btn-ghost" disabled={busy} onClick={() => run({ action: "ban", userId: id, banned: false })}>Unban</button>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
