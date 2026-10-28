import fs from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { hashPassword } from "./auth-password";
import { fuzzPoint } from "./geo";
import { todayIn } from "./time";
import { voidAuthorization } from "./paypal";
import { DEMO_BUYERS, DEMO_CENTER, DEMO_HISTORY, DEMO_LISTINGS, DEMO_SELLERS, DEMO_TZ } from "./demo-data";

const PHOTO_DIR = path.join(process.cwd(), "prisma", "demo-photos");

// The next 14 days in the demo time zone, so demo sellers always have open pickup times.
export function demoDates(from = new Date()) {
  const out: string[] = [];
  for (let i = 0; i < 14; i++) out.push(todayIn(DEMO_TZ, new Date(from.getTime() + i * 86400_000)));
  return out;
}

// Demo sellers are paid out to the sandbox seller accounts listed in DEMO_PAYOUT_EMAILS.
function payoutEmails() {
  return (process.env.DEMO_PAYOUT_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function seedDemo() {
  // Release any live sandbox holds before wiping.
  const holding = await db.order.findMany({
    where: { authorizationId: { not: null }, status: { in: ["AWAITING_SELLER", "CONFIRMED", "REPORTED_MISSING", "DISPUTED"] } },
  });
  for (const o of holding) {
    try {
      await voidAuthorization(o.authorizationId!);
    } catch {
      // The sandbox hold expires on its own if this fails.
    }
  }

  await db.$transaction([
    db.review.deleteMany(),
    db.message.deleteMany(),
    db.report.deleteMany(),
    db.order.deleteMany(),
    db.photo.deleteMany(),
    db.listing.deleteMany(),
    db.pickupSpot.deleteMany(),
    db.user.deleteMany(),
  ]);

  const passwordHash = await hashPassword(process.env.DEMO_PASSWORD || "porch-demo-password");
  const emails = payoutEmails();
  const dates = demoDates();
  const users: Record<string, string> = {};

  await db.user.create({
    data: { email: "demo-admin@porch.demo", name: "Admin", role: "ADMIN", isDemo: true, passwordHash },
  });

  for (const b of DEMO_BUYERS) {
    const u = await db.user.create({
      data: {
        email: `demo-buyer-${b.key}@porch.demo`,
        name: b.name,
        isDemo: true,
        passwordHash,
        homeLat: DEMO_CENTER.lat,
        homeLng: DEMO_CENTER.lng,
      },
    });
    users[b.key] = u.id;
  }

  for (const [i, s] of DEMO_SELLERS.entries()) {
    const lat = DEMO_CENTER.lat + s.dLat;
    const lng = DEMO_CENTER.lng + s.dLng;
    const pub = fuzzPoint(lat, lng);
    const u = await db.user.create({
      data: {
        email: `demo-seller-${s.key}@porch.demo`,
        name: s.name,
        isDemo: true,
        passwordHash,
        payoutWallet: "PAYPAL",
        payoutReceiver: emails.length ? emails[i % emails.length] : `demo-seller-${s.key}@porch.demo`,
        homeLat: lat,
        homeLng: lng,
        pickupSpot: {
          create: {
            address: s.address,
            lat,
            lng,
            publicLat: pub.lat,
            publicLng: pub.lng,
            instructions: s.instructions,
            dates,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
            timezone: DEMO_TZ,
          },
        },
      },
    });
    users[s.key] = u.id;
  }

  const photo = (name: string) => fs.readFile(path.join(PHOTO_DIR, `${name}.jpg`));

  for (const [i, l] of DEMO_LISTINGS.entries()) {
    await db.listing.create({
      data: {
        sellerId: users[l.seller],
        title: l.title,
        description: l.description,
        category: l.category,
        condition: l.condition,
        conditionNotes: l.flaws,
        price: l.price * 100,
        suggestedPrice: l.price * 100,
        priceReason: l.reason,
        // Spread creation times so "newest" ordering looks natural.
        createdAt: new Date(Date.now() - i * 37 * 60_000),
        photos: { create: [{ data: new Uint8Array(await photo(l.photo)), position: 0 }] },
      },
    });
  }

  for (const [i, h] of DEMO_HISTORY.entries()) {
    const when = new Date(Date.now() - (i + 3) * 86400_000);
    const listing = await db.listing.create({
      data: {
        sellerId: users[h.seller],
        title: h.title,
        description: "",
        category: "Other",
        condition: "GOOD",
        conditionNotes: [],
        price: h.price * 100,
        status: "SOLD",
        createdAt: when,
        photos: { create: [{ data: new Uint8Array(await photo(h.photo)), position: 0 }] },
      },
    });
    const order = await db.order.create({
      data: {
        listingId: listing.id,
        buyerId: users[h.buyer],
        sellerId: users[h.seller],
        amount: h.price * 100,
        pickupAt: when,
        status: "COMPLETED",
        createdAt: when,
        confirmedAt: when,
        completedAt: when,
        closedAt: when,
      },
    });
    await db.review.createMany({
      data: [
        { orderId: order.id, authorId: users[h.buyer], targetId: users[h.seller], stars: h.sellerStars, text: h.sellerText, createdAt: when },
        { orderId: order.id, authorId: users[h.seller], targetId: users[h.buyer], stars: h.buyerStars, text: h.buyerText, createdAt: when },
      ],
    });
  }
}

// Puts a fresh copy of each demo listing back up about 10 minutes after it sells,
// so the demo town never runs out while several people are trying it.
export async function restockDemo(now = new Date()) {
  const restocked: string[] = [];
  const sellers = await db.user.findMany({
    where: { isDemo: true, email: { startsWith: "demo-seller-" } },
    select: { id: true, email: true },
  });
  const byKey = new Map(sellers.map((s) => [s.email.slice("demo-seller-".length).split("@")[0], s.id]));
  for (const l of DEMO_LISTINGS) {
    const sellerId = byKey.get(l.seller);
    if (!sellerId) continue;
    const copies = await db.listing.findMany({
      where: { sellerId, title: l.title },
      select: { status: true, orders: { where: { closedAt: { not: null } }, select: { closedAt: true }, orderBy: { closedAt: "desc" }, take: 1 } },
    });
    if (!copies.length || copies.some((c) => c.status === "ACTIVE" || c.status === "PENDING")) continue;
    const lastClosed = Math.max(0, ...copies.map((c) => c.orders[0]?.closedAt?.getTime() ?? 0));
    if (now.getTime() - lastClosed < 10 * 60_000) continue;
    await db.listing.create({
      data: {
        sellerId,
        title: l.title,
        description: l.description,
        category: l.category,
        condition: l.condition,
        conditionNotes: l.flaws,
        price: l.price * 100,
        suggestedPrice: l.price * 100,
        priceReason: l.reason,
        photos: {
          create: [{ data: new Uint8Array(await fs.readFile(path.join(PHOTO_DIR, `${l.photo}.jpg`))), position: 0 }],
        },
      },
    });
    restocked.push(l.title);
  }
  return restocked;
}

// Keeps demo pickup dates rolling forward without a reset.
export async function refreshDemoDates() {
  await db.pickupSpot.updateMany({ where: { user: { isDemo: true } }, data: { dates: demoDates() } });
}
