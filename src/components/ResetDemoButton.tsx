"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function ResetDemoButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-2">
      <button
        className="btn-danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api("/api/demo/reset");
            window.location.href = "/login";
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Resetting..." : "Reset the demo town"}
      </button>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
