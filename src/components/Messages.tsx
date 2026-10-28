"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Msg = { id: string; body: string; system: boolean; mine: boolean; author: string; at: string };

export default function Messages({ orderId, messages, closed }: { orderId: string; meId: string; messages: Msg[]; closed: boolean }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/orders/${orderId}/messages`, { body });
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold">Messages</h2>
      <div className="mt-3 space-y-2">
        {messages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
        {messages.map((m) =>
          m.system ? (
            <p key={m.id} className="py-1 text-center text-xs text-muted">{m.body}</p>
          ) : (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "bg-brand text-white" : "bg-line/60"}`}>
                {!m.mine && <p className="text-xs font-semibold">{m.author}</p>}
                <p className="whitespace-pre-line">{m.body}</p>
              </div>
            </div>
          ),
        )}
      </div>
      {!closed && (
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input className="field flex-1" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message" maxLength={1000} aria-label="Message" />
          <button className="btn-primary" disabled={busy || !body.trim()}>Send</button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </section>
  );
}
