"use client";

import { api } from "@/lib/client";

export default function LogoutButton() {
  return (
    <button
      className="rounded-lg px-3 py-2 text-sm hover:bg-card"
      onClick={async () => {
        await api("/api/auth/logout");
        window.location.href = "/";
      }}
    >
      Log out
    </button>
  );
}
