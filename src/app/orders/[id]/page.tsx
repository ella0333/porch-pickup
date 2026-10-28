import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { money, STATUS_LABEL } from "@/lib/format";
import { whenLabel } from "@/lib/time";
import { CONTEST_HOURS, SELLER_REPLY_HOURS } from "@/lib/orders";
import { ratingFor } from "@/lib/reviews";
import Stars from "@/components/Stars";
import OrderActions from "@/components/OrderActions";
import Messages from "@/components/Messages";
import ReviewForm from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

const STEPS = ["Paid and held", "Seller confirmed", "Picked up"];

function stepIndex(status: string) {
  if (status === "AWAITING_SELLER") return 0;
  if (["CONFIRMED", "REPORTED_MISSING", "DISPUTED"].includes(status)) return 1;
  if (status === "COMPLETED") return 2;
  return -1;
}

function hoursLeft(from: Date | null, hours: number) {
  if (!from) return null;
  const ms = from.getTime() + hours * 3600_000 - Date.now();
  return Math.max(0, Math.ceil(ms / 3600_000));
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/orders/${id}`);
  const order = await db.order.findUnique({
    where: { id },
    include: {
      listing: { include: { photos: { select: { id: true }, orderBy: { position: "asc" }, take: 1 } } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true, pickupSpot: true } },
      messages: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      reviews: true,
    },
  });
  if (!order) notFound();
  const role = order.buyerId === user.id ? "buyer" : order.sellerId === user.id ? "seller" : user.role === "ADMIN" ? "admin" : null;
  if (!role) notFound();

  const spot = order.seller.pickupSpot;
  const tz = spot?.timezone ?? "America/New_York";
  const other = role === "buyer" ? order.seller : order.buyer;
  const otherRating = await ratingFor(other.id);
  const revealAddress = role !== "buyer" || ["CONFIRMED", "REPORTED_MISSING", "DISPUTED", "COMPLETED"].includes(order.status);
  const step = stepIndex(order.status);
  const myReview = order.reviews.find((r) => r.authorId === user.id);
  const canReview = role !== "admin" && ["COMPLETED", "REFUNDED"].includes(order.status) && !myReview;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-card">
            {order.listing.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/photos/${order.listing.photos[0].id}`} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div>
            <Link href={`/listings/${order.listingId}`} className="text-xl font-bold hover:underline">{order.listing.title}</Link>
            <p className="text-muted">{money(order.amount)} · {STATUS_LABEL[order.status]}</p>
          </div>
        </div>

        {step >= 0 && (
          <ol className="grid grid-cols-3 gap-2">
            {STEPS.map((s, i) => (
              <li key={s} className={`rounded-lg px-3 py-2 text-center text-xs font-medium ${i <= step ? "bg-brand text-white" : "bg-line/60 text-muted"}`}>
                {s}
              </li>
            ))}
          </ol>
        )}

        <div className="card space-y-3 p-5">
          <p className="text-sm">
            <span className="font-semibold">Pickup:</span> {whenLabel(order.pickupAt, tz)}, give or take an hour
          </p>
          {revealAddress && spot ? (
            <div className="space-y-2 rounded-lg bg-brand-soft p-4 text-sm text-brand-dark">
              <p className="font-semibold">{spot.address}</p>
              <p>{spot.instructions}</p>
              {order.listing.sellerNotes && <p>Seller note: {order.listing.sellerNotes}</p>}
              {role === "buyer" && (
                <a
                  className="inline-block font-semibold underline"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-line/40 p-4 text-sm text-muted">
              Once the seller confirms, their address and pickup instructions will show up here.
              {order.status === "AWAITING_SELLER" &&
                ` If they don't respond within ${SELLER_REPLY_HOURS} hours, the payment is released automatically.`}
            </p>
          )}
          {order.status === "REPORTED_MISSING" && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              The item was reported missing{order.missingNote ? `: "${order.missingNote}"` : ""}. If the seller doesn&apos;t
              respond within about {hoursLeft(order.reportedAt, CONTEST_HOURS)} hours, the buyer won&apos;t be charged.
            </p>
          )}
          {order.status === "DISPUTED" && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              The seller says the item was there{order.contestNote ? `: "${order.contestNote}"` : ""}, so our team is
              looking into it. The payment stays on hold until it&apos;s sorted out.
            </p>
          )}
          {order.status === "COMPLETED" && order.payoutStatus && role !== "buyer" && (
            <p className="text-xs text-muted">Payout status: {order.payoutStatus}</p>
          )}
        </div>

        <OrderActions orderId={order.id} role={role} status={order.status} />

        <Messages orderId={order.id} meId={user.id} messages={order.messages.map((m) => ({
          id: m.id,
          body: m.body,
          system: m.system,
          mine: m.authorId === user.id && !m.system,
          author: m.author.name,
          at: m.createdAt.toISOString(),
        }))} closed={order.status === "AWAITING_PAYMENT"} />
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-muted">{role === "buyer" ? "Seller" : "Buyer"}</p>
          <Link href={`/users/${other.id}`} className="mt-1 block font-semibold hover:underline">{other.name}</Link>
          <Stars value={otherRating.avg} count={otherRating.count} />
        </div>
        {canReview && <ReviewForm orderId={order.id} name={other.name} />}
        {myReview && (
          <div className="card p-5 text-sm">
            <p className="font-semibold">Your review</p>
            <Stars value={myReview.stars} />
            {myReview.text && <p className="mt-1 text-muted">{myReview.text}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
