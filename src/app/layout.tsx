import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import DemoSwitcher from "@/components/DemoSwitcher";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Porch Pickup",
  description: "An easy local marketplace for trustworthy porch pickups.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const demoUsers = env.demo
    ? await db.user.findMany({
        where: { isDemo: true, role: "USER" },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { email: "asc" },
      })
    : [];

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {env.demo && (
          <div className="bg-ink px-4 py-2 text-center text-xs text-white">
            This is a demo with made-up sellers and addresses, and all payments use PayPal test money.
          </div>
        )}
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 11l9-7 9 7" />
                  <path d="M5 10v10h14V10" />
                  <path d="M10 20v-5h4v5" />
                </svg>
              </span>
              <span>Porch Pickup</span>
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm">
              {user ? (
                <>
                  <Link className="rounded-lg px-3 py-2 hover:bg-card" href="/orders">Orders</Link>
                  {user.role === "ADMIN" && <Link className="rounded-lg px-3 py-2 hover:bg-card" href="/admin">Admin</Link>}
                  <Link className="rounded-lg px-3 py-2 hover:bg-card" href={`/users/${user.id}`}>Profile</Link>
                  <Link className="btn-primary ml-1" href="/sell">Sell</Link>
                  {!env.demo && <LogoutButton />}
                </>
              ) : (
                <>
                  <Link className="rounded-lg px-3 py-2 hover:bg-card" href="/login">Log in</Link>
                  <Link className="btn-primary" href="/signup">Sign up</Link>
                </>
              )}
              {env.demo && <DemoSwitcher users={demoUsers} currentId={user?.id ?? null} />}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
