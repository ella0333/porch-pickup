"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type DemoUser = { id: string; name: string; role: string; email: string };

export default function DemoSwitcher({ users, currentId }: { users: DemoUser[]; currentId: string | null }) {
  const [busy, setBusy] = useState(false);

  async function switchTo(id: string) {
    setBusy(true);
    try {
      await api("/api/demo/switch", { userId: id });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ml-2 flex items-center gap-1">
      <select
        aria-label="Switch demo user"
        className="field w-auto py-1.5"
        disabled={busy}
        value={users.some((u) => u.id === currentId) ? currentId ?? "" : ""}
        onChange={(e) => e.target.value && switchTo(e.target.value)}
      >
        <option value="">Pick a demo user</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email.startsWith("demo-seller") ? "seller" : "buyer"})
          </option>
        ))}
      </select>
    </div>
  );
}
