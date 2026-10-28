import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { money, STATUS_LABEL, CONDITION_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

const NEEDS_SELLER = ["AWAITING_SELLER", "REPORTED_MISSING"];
const NEEDS_BUYER = ["CONFIRMED"];

export default async function OrdersPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/orders");

  const include = {
    listing: { select: { title: true, photos: { select: { id: true }, orderBy: { position: "asc" as const }, take: 1 } } },
  };
  const [buying, selling, listings] = await Promise.all([
    db.order.findMany({ where: { buyerId: user.id, status: { not: "AWAITING_PAYMENT" } }, include, orderBy: { createdAt: "desc" } }),
    db.order.findMany({ where: { sellerId: user.id, status: { not: "AWAITING_PAYMENT" } }, include, orderBy: { createdAt: "desc" } }),
    db.listing.findMany({
      where: { sellerId: user.id, status: { in: ["ACTIVE", "PENDING"] } },
      select: { id: true, title: true, price: true, condition: true, status: true, photos: { select: { id: true }, take: 1, orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  type Row = (typeof buying)[number];
  const OrderRow = ({ o, attention }: { o: Row; attention: boolean }) => (
    <Link href={`/orders/${o.id}`} className="card flex items-center gap-3 p-3 hover:border-brand">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-line/50">
        {o.listing.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/photos/${o.listing.photos[0].id}`} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{o.listing.title}</p>
        <p className="text-sm text-muted">{STATUS_LABEL[o.status]}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{money(o.amount)}</p>
        {attention && <span className="pill bg-warn-soft text-warn">Needs you</span>}
      </div>
    </Link>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Selling</h2>
        {selling.length === 0 && <p className="text-sm text-muted">No sales yet.</p>}
        {selling.map((o) => <OrderRow key={o.id} o={o} attention={NEEDS_SELLER.includes(o.status)} />)}
        <h3 className="pt-4 font-semibold">Your listings</h3>
        {listings.length === 0 && (
          <p className="text-sm text-muted">
            Nothing listed. <Link href="/sell" className="text-brand underline">Sell something</Link>
          </p>
        )}
        {listings.map((l) => (
          <Link key={l.id} href={`/listings/${l.id}`} className="card flex items-center gap-3 p-3 hover:border-brand">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-line/50">
              {l.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/photos/${l.photos[0].id}`} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{l.title}</p>
              <p className="text-sm text-muted">{CONDITION_LABEL[l.condition]} · {l.status === "PENDING" ? "Sale in progress" : "Active"}</p>
            </div>
            <p className="font-semibold">{money(l.price)}</p>
          </Link>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Buying</h2>
        {buying.length === 0 && (
          <p className="text-sm text-muted">
            Nothing bought yet. <Link href="/" className="text-brand underline">Browse nearby</Link>
          </p>
        )}
        {buying.map((o) => <OrderRow key={o.id} o={o} attention={NEEDS_BUYER.includes(o.status)} />)}
      </section>
    </div>
  );
}
