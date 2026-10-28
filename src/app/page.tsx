import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { feed, type Origin } from "@/lib/listings";
import { env } from "@/lib/env";
import ListingCard from "@/components/ListingCard";
import FeedControls from "@/components/FeedControls";
import { FeedMap } from "@/components/Maps";
import { DEMO_CENTER } from "@/lib/demo-data";

type Search = Record<string, string | undefined>;

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const user = await currentUser();

  let origin: Origin = null;
  let placeLabel: string | null = null;
  if (sp.lat && sp.lng && Number.isFinite(Number(sp.lat)) && Number.isFinite(Number(sp.lng))) {
    origin = { lat: Number(sp.lat), lng: Number(sp.lng) };
    placeLabel = sp.place || "the spot you picked";
  } else if (user?.homeLat && user.homeLng) {
    origin = { lat: user.homeLat, lng: user.homeLng };
    placeLabel = "your home";
  } else if (env.demo) {
    origin = DEMO_CENTER;
    placeLabel = "the demo town center";
  }

  const items = await feed(origin, {
    category: sp.cat || undefined,
    maxCents: sp.max ? Number(sp.max) * 100 : undefined,
    maxMiles: sp.dist ? Number(sp.dist) : undefined,
    q: sp.q?.trim() || undefined,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand px-6 py-8 text-white sm:px-10">
        <h1 className="max-w-2xl text-2xl font-bold sm:text-3xl">Buy and sell with your neighbors, porch pickup style.</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          Grab great finds from porches nearby, whenever it suits you. Your payment is held safely until you have the
          item in hand, so you never pay for something that wasn&apos;t there.
        </p>
        {!user && (
          <div className="mt-5 flex gap-2">
            <Link href="/signup" className="btn bg-white text-brand-dark hover:bg-white/90">Get started</Link>
          </div>
        )}
      </section>

      <Suspense>
        <FeedControls placeLabel={placeLabel} />
      </Suspense>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-muted">No listings match. Try a wider distance or another category.</div>
      ) : sp.view === "map" ? (
        <FeedMap pins={items} center={origin ?? { lat: items[0].lat, lng: items[0].lng }} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => <ListingCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
