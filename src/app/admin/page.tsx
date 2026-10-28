import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { money, STATUS_LABEL } from "@/lib/format";
import AdminButtons from "@/components/AdminButtons";
import ResetDemoButton from "@/components/ResetDemoButton";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") notFound();

  const [disputes, reports, failedPayouts, banned] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ["DISPUTED", "REPORTED_MISSING"] } },
      include: { listing: { select: { title: true } }, buyer: { select: { name: true } }, seller: { select: { name: true } } },
      orderBy: { reportedAt: "asc" },
    }),
    db.report.findMany({
      where: { resolved: false },
      include: {
        reporter: { select: { name: true } },
        reportedUser: { select: { id: true, name: true, banned: true } },
        listing: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.order.findMany({ where: { payoutStatus: { startsWith: "FAILED" } }, include: { seller: { select: { name: true } } } }),
    db.user.findMany({ where: { banned: true }, select: { id: true, name: true, email: true } }),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Admin</h1>

      {env.demo && (
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">Demo town</h2>
          <p className="text-sm text-muted">
            Sold demo items come back on their own about 10 minutes after a sale. Resetting wipes every order and puts the
            town back the way it started, and it logs you out.
          </p>
          <ResetDemoButton />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Pickup disputes</h2>
        {disputes.length === 0 && <p className="text-sm text-muted">Nothing to review.</p>}
        {disputes.map((o) => (
          <div key={o.id} className="card space-y-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/orders/${o.id}`} className="font-semibold hover:underline">{o.listing.title}</Link>
              <span className="text-sm text-muted">{money(o.amount)} · {STATUS_LABEL[o.status]}</span>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-line/40 p-3">
                <p className="font-semibold">Buyer {o.buyer.name}</p>
                <p className="text-muted">{o.missingNote || "No note."}</p>
              </div>
              <div className="rounded-lg bg-line/40 p-3">
                <p className="font-semibold">Seller {o.seller.name}</p>
                <p className="text-muted">{o.contestNote || (o.status === "DISPUTED" ? "No note." : "Has not contested yet.")}</p>
                {o.contestPhotoId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/photos/${o.contestPhotoId}`} alt="Seller's photo of the porch" className="mt-2 max-h-48 rounded-lg" />
                )}
              </div>
            </div>
            <AdminButtons kind="dispute" id={o.id} />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Reports</h2>
        {reports.length === 0 && <p className="text-sm text-muted">No open reports.</p>}
        {reports.map((r) => (
          <div key={r.id} className="card space-y-2 p-5 text-sm">
            <p>
              <span className="font-semibold">{r.reporter.name}</span> reported{" "}
              {r.listing ? (
                <Link className="underline" href={`/listings/${r.listing.id}`}>{r.listing.title}</Link>
              ) : null}
              {r.listing && r.reportedUser ? " by " : ""}
              {r.reportedUser ? <Link className="underline" href={`/users/${r.reportedUser.id}`}>{r.reportedUser.name}</Link> : null}
            </p>
            <p className="text-muted">{r.reason}</p>
            <AdminButtons
              kind="report"
              id={r.id}
              userId={r.reportedUser && !r.reportedUser.banned ? r.reportedUser.id : undefined}
              listingId={r.listing && r.listing.status === "ACTIVE" ? r.listing.id : undefined}
            />
          </div>
        ))}
      </section>

      {failedPayouts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Payouts that failed</h2>
          {failedPayouts.map((o) => (
            <p key={o.id} className="card p-4 text-sm">
              <Link className="font-semibold underline" href={`/orders/${o.id}`}>{money(o.amount)} to {o.seller.name}</Link>{" "}
              <span className="text-muted">{o.payoutStatus}</span>
            </p>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Banned users</h2>
        {banned.length === 0 && <p className="text-sm text-muted">Nobody is banned.</p>}
        {banned.map((u) => (
          <div key={u.id} className="card flex items-center justify-between p-4 text-sm">
            <span>{u.name} · {u.email}</span>
            <AdminButtons kind="unban" id={u.id} />
          </div>
        ))}
      </section>
    </div>
  );
}
