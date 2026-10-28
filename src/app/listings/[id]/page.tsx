import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { CONDITION_LABEL, money } from "@/lib/format";
import { milesBetween, roundMiles } from "@/lib/geo";
import { minuteLabel, pickupSlots } from "@/lib/time";
import { ratingFor } from "@/lib/reviews";
import Stars from "@/components/Stars";
import BuyBox from "@/components/BuyBox";
import Gallery from "@/components/Gallery";
import ReportButton from "@/components/ReportButton";
import OwnerControls from "@/components/OwnerControls";
import { AreaMap } from "@/components/Maps";
import { DEMO_CENTER } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      photos: { select: { id: true }, orderBy: { position: "asc" } },
      seller: { select: { id: true, name: true, banned: true, createdAt: true, pickupSpot: true } },
    },
  });
  if (!listing || listing.status === "REMOVED" || listing.seller.banned) notFound();
  const user = await currentUser();
  const spot = listing.seller.pickupSpot;
  const rating = await ratingFor(listing.seller.id);
  const isOwner = user?.id === listing.sellerId;

  const origin = user?.homeLat && user.homeLng ? { lat: user.homeLat, lng: user.homeLng } : env.demo ? DEMO_CENTER : null;
  const miles = origin && spot ? roundMiles(milesBetween(origin, { lat: spot.publicLat, lng: spot.publicLng })) : null;
  const slots = spot ? pickupSlots(spot) : [];

  const sdkUrl = env.paypalEnv === "live" ? "https://www.paypal.com/web-sdk/v6/core" : "https://www.sandbox.paypal.com/web-sdk/v6/core";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Gallery photoIds={listing.photos.map((p) => p.id)} />
        <div>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="mt-1 text-2xl font-semibold text-brand">{money(listing.price)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="pill bg-brand-soft text-brand-dark">{CONDITION_LABEL[listing.condition]}</span>
            <span className="pill bg-line/60">{listing.category}</span>
            {miles !== null && <span className="pill bg-line/60">{miles} mi away</span>}
          </div>
        </div>
        {listing.conditionNotes.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold">Visible wear</h2>
            <ul className="mt-1 list-inside list-disc text-sm text-muted">
              {listing.conditionNotes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        )}
        {listing.description && <p className="whitespace-pre-line leading-relaxed">{listing.description}</p>}
        {spot && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">General area</h2>
            <AreaMap lat={spot.publicLat} lng={spot.publicLng} />
            <p className="text-xs text-muted">You&apos;ll get the exact address once the seller confirms your order.</p>
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="card p-5">
          <Link href={`/users/${listing.seller.id}`} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft font-semibold text-brand-dark">
              {listing.seller.name[0]?.toUpperCase()}
            </span>
            <span>
              <span className="block font-semibold">{listing.seller.name}</span>
              <Stars value={rating.avg} count={rating.count} />
            </span>
          </Link>
          {spot && (
            <p className="mt-3 text-sm text-muted">
              Porch pickup {minuteLabel(spot.startMinute)} to {minuteLabel(spot.endMinute % 1440)}
            </p>
          )}
        </div>

        <div className="card p-5">
          {listing.status === "SOLD" ? (
            <p className="font-semibold">This item has been picked up.</p>
          ) : listing.status === "PENDING" ? (
            <p className="font-semibold">Someone is buying this right now.</p>
          ) : isOwner ? (
            <OwnerControls listingId={listing.id} title={listing.title} priceCents={listing.price} />
          ) : !user ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">Log in to buy this item.</p>
              <Link href={`/login?next=/listings/${listing.id}`} className="btn-primary w-full">Log in to buy</Link>
            </div>
          ) : (
            <BuyBox listingId={listing.id} slots={slots} clientId={env.paypalClientId} sdkUrl={sdkUrl} sandbox={env.paypalEnv !== "live"} />
          )}
        </div>
        {isOwner && listing.priceReason && (
          <p className="px-1 text-xs text-muted">Price suggestion: {listing.priceReason}</p>
        )}
        {user && !isOwner && <ReportButton listingId={listing.id} userId={listing.seller.id} />}
      </aside>
    </div>
  );
}
