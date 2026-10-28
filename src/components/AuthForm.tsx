"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${mode}`, form);
      const next = new URLSearchParams(window.location.search).get("next") || (mode === "signup" ? "/setup" : "/");
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-6 max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-bold">{mode === "login" ? "Log in" : "Create an account"}</h1>
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">First name</label>
          <input className="field" id="name" name="name" required maxLength={40} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="field" id="password" name="password" type="password" required minLength={8} />
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {mode === "login" ? "Log in" : "Sign up"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>New here? <Link className="font-medium text-brand" href="/signup">Create an account</Link></>
        ) : (
          <>Have an account? <Link className="font-medium text-brand" href="/login">Log in</Link></>
        )}
      </p>
    </form>
  );
}
