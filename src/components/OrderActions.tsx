"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Props = { orderId: string; role: "buyer" | "seller" | "admin"; status: string };

export default function OrderActions({ orderId, role, status }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"" | "accept" | "notthere" | "contest">("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      if (action === "contest") {
        const form = new FormData();
        form.set("action", "contest");
        form.set("text", text);
        if (photo) form.set("photo", photo);
        await api(`/api/orders/${orderId}/action`, form);
      } else {
        await api(`/api/orders/${orderId}/action`, { action, ...extra });
      }
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const err = error && <p className="text-sm text-bad">{error}</p>;

  if (role === "seller" && status === "AWAITING_SELLER") {
    if (mode === "accept") {
      return (
        <div className="card space-y-3 p-5">
          <label className="label" htmlFor="notes">Anything the buyer should know? (optional)</label>
          <textarea id="notes" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="It will be in a white trash bag so it stays dry." />
          {err}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy} onClick={() => act("accept", { text })}>Confirm and share address</button>
            <button className="btn-ghost" onClick={() => setMode("")}>Back</button>
          </div>
        </div>
      );
    }
    return (
      <div className="card space-y-3 p-5">
        <p className="font-semibold">You have a buyer! Can you have it out by their pickup time?</p>
        <p className="text-sm text-muted">When you confirm, we&apos;ll share your address and pickup instructions with this buyer.</p>
        {err}
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy} onClick={() => setMode("accept")}>Yes, confirm</button>
          <button className="btn-danger" disabled={busy} onClick={() => act("decline")}>Decline</button>
        </div>
      </div>
    );
  }

  if (role === "buyer" && status === "AWAITING_SELLER") {
    return (
      <div className="card space-y-3 p-5">
        <p className="text-sm text-muted">Your payment is on hold and you haven&apos;t been charged. You can still cancel until the seller confirms.</p>
        {err}
        <button className="btn-ghost" disabled={busy} onClick={() => act("cancel")}>Cancel order</button>
      </div>
    );
  }

  if (role === "buyer" && (status === "CONFIRMED" || status === "REPORTED_MISSING")) {
    if (mode === "notthere") {
      return (
        <div className="card space-y-3 p-5">
          <label className="label" htmlFor="miss">What did you find? (optional)</label>
          <textarea id="miss" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nothing on the bench or by the door." />
          <p className="text-xs text-muted">It might be a mix-up, so try messaging the seller first. If they don&apos;t respond within 24 hours, you won&apos;t be charged.</p>
          {err}
          <div className="flex gap-2">
            <button className="btn-danger flex-1" disabled={busy} onClick={() => act("notthere", { text })}>Report not there</button>
            <button className="btn-ghost" onClick={() => setMode("")}>Back</button>
          </div>
        </div>
      );
    }
    return (
      <div className="card space-y-3 p-5">
        <p className="font-semibold">Picked it up?</p>
        <p className="text-sm text-muted">Tap Got it once you have the item and we&apos;ll send the payment to the seller. If you forget, it&apos;s sent automatically 3 days after your pickup time.</p>
        {err}
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy} onClick={() => act("gotit")}>Got it</button>
          {status === "CONFIRMED" && (
            <button className="btn-danger" disabled={busy} onClick={() => setMode("notthere")}>Not there</button>
          )}
        </div>
        {status === "REPORTED_MISSING" && <p className="text-xs text-muted">Found it after all? Tap Got it and the seller will be paid.</p>}
      </div>
    );
  }

  if (role === "seller" && status === "REPORTED_MISSING") {
    if (mode === "contest") {
      return (
        <div className="card space-y-3 p-5">
          <label className="label" htmlFor="contest">Where did you leave it?</label>
          <textarea id="contest" className="field" value={text} onChange={(e) => setText(e.target.value)} required />
          <label className="label" htmlFor="cphoto">Photo of the item on the porch (optional)</label>
          <input id="cphoto" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-sm" />
          {err}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy || !text.trim()} onClick={() => act("contest")}>Send to our team</button>
            <button className="btn-ghost" onClick={() => setMode("")}>Back</button>
          </div>
        </div>
      );
    }
    return (
      <div className="card space-y-3 p-5">
        <p className="font-semibold">The buyer couldn&apos;t find the item.</p>
        <p className="text-sm text-muted">
          It might just be a mix-up, so try sending them a message. If the item was out, you can contest and our team will
          take a look. If you don&apos;t respond, the buyer&apos;s payment is released.
        </p>
        {err}
        <button className="btn-ghost" onClick={() => setMode("contest")}>Contest</button>
      </div>
    );
  }

  return null;
}
