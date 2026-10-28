import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { milesBetween, roundMiles } from "./geo";

// Distances always use the fuzzed public point, never the real address,
// so querying from different spots can't triangulate a seller's house.

export type Origin = { lat: number; lng: number } | null;

export type FeedFilters = { category?: string; maxCents?: number; maxMiles?: number; q?: string; sellerId?: string };

export async function feed(origin: Origin, f: FeedFilters) {
  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    seller: { banned: false, pickupSpot: { isNot: null } },
  };
  if (f.category) where.category = f.category;
  if (f.sellerId) where.sellerId = f.sellerId;
  if (f.maxCents) where.price = { lte: f.maxCents };
  if (f.q) where.OR = [{ title: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }];

  const rows = await db.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      title: true,
      price: true,
      condition: true,
      category: true,
      createdAt: true,
      photos: { select: { id: true }, orderBy: { position: "asc" }, take: 1 },
      seller: { select: { pickupSpot: { select: { publicLat: true, publicLng: true } } } },
    },
  });

  const items = rows.map((r) => {
    const spot = r.seller.pickupSpot!;
    const miles = origin ? roundMiles(milesBetween(origin, { lat: spot.publicLat, lng: spot.publicLng })) : null;
    return {
      id: r.id,
      title: r.title,
      price: r.price,
      condition: r.condition,
      category: r.category,
      photoId: r.photos[0]?.id ?? null,
      miles,
      lat: spot.publicLat,
      lng: spot.publicLng,
    };
  });

  const filtered = f.maxMiles && origin ? items.filter((i) => (i.miles ?? 0) <= f.maxMiles!) : items;
  if (origin) filtered.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
  return filtered;
}

export type FeedItem = Awaited<ReturnType<typeof feed>>[number];
