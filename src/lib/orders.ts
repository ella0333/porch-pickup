import type { Order, OrderStatus } from "@prisma/client";
import { db } from "./db";
import { HttpError, type SessionUser } from "./auth";
import * as paypal from "./paypal";
import { pickupSlots, zonedToUtc } from "./time";
import { env } from "./env";
import { refreshDemoDates, restockDemo } from "./demo";

// The order state machine. Money is only ever held (authorized) until the buyer
// confirms the pickup; every exit path that is not a pickup voids the hold.

export const SELLER_REPLY_HOURS = 12;
export const CONTEST_HOURS = 24;
// A buyer who never taps anything this long after the pickup time is treated as having picked up.
export const AUTO_RELEASE_HOURS = 72;
const HOUR = 60 * 60 * 1000;
const HONOR_PERIOD = 3 * 24 * HOUR;

// Statuses where PayPal still holds the buyer's money.
const HOLDING: OrderStatus[] = ["AWAITING_SELLER", "CONFIRMED", "REPORTED_MISSING", "DISPUTED"];

async function note(orderId: string, authorId: string, body: string) {
  await db.message.create({ data: { orderId, authorId, body, system: true } });
}

async function load(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { listing: true, seller: true, buyer: true },
  });
  if (!order) throw new HttpError(404, "Order not found.");
  return order;
}

function expect(order: Order, ...statuses: OrderStatus[]) {
  if (!statuses.includes(order.status)) throw new HttpError(409, "This order has already moved on. Refresh the page.");
}

async function releaseHold(order: Order) {
  if (order.authorizationId) await paypal.voidAuthorization(order.authorizationId);
}

export async function startOrder(user: SessionUser, listingId: string, date: string, minute: number) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { include: { pickupSpot: true } } },
  });
  if (!listing || listing.status !== "ACTIVE") throw new HttpError(409, "This item is no longer available.");
  if (listing.sellerId === user.id) throw new HttpError(400, "You can't buy your own item.");
  const spot = listing.seller.pickupSpot;
  if (!spot) throw new HttpError(409, "The seller hasn't set up pickup yet.");
  if (!pickupSlots(spot).some((s) => s.date === date && s.minute === minute)) {
    throw new HttpError(400, "That pickup time isn't available. Pick another one.");
  }

  // Abandoned checkouts from this buyer on this listing are just dropped.
  await db.order.updateMany({
    where: { listingId, buyerId: user.id, status: "AWAITING_PAYMENT" },
    data: { status: "CANCELLED", closedAt: new Date() },
  });

  const order = await db.order.create({
    data: {
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
      amount: listing.price,
      pickupAt: zonedToUtc(date, minute, spot.timezone),
    },
  });
  const pp = await paypal.createHoldOrder({ orderId: order.id, cents: listing.price, title: listing.title });
  await db.order.update({ where: { id: order.id }, data: { paypalOrderId: pp.id } });
  return { orderId: order.id, paypalOrderId: pp.id };
}

export async function approveOrder(user: SessionUser, paypalOrderId: string) {
  const order = await db.order.findUnique({ where: { paypalOrderId }, include: { listing: true } });
  if (!order || order.buyerId !== user.id) throw new HttpError(404, "Order not found.");
  if (order.status !== "AWAITING_PAYMENT") return order;

  const auth = await paypal.authorizeOrder(paypalOrderId);
  if (!auth.authorizationId) throw new HttpError(502, "PayPal did not return a hold. Nothing was charged.");

  // Only one buyer can win the listing.
  const claimed = await db.listing.updateMany({
    where: { id: order.listingId, status: "ACTIVE" },
    data: { status: "PENDING" },
  });
  if (claimed.count === 0) {
    await paypal.voidAuthorization(auth.authorizationId);
    await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED", closedAt: new Date() } });
    throw new HttpError(409, "Someone else bought this a moment ago. Your hold was released.");
  }

  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      status: "AWAITING_SELLER",
      authorizationId: auth.authorizationId,
      authorizedAt: new Date(),
      fundingSource: auth.fundingSource,
    },
  });
  await note(order.id, order.buyerId, `Payment is on hold with ${auth.fundingSource === "venmo" ? "Venmo" : "PayPal"} while the seller confirms.`);
  return updated;
}

export async function sellerAccept(user: SessionUser, orderId: string, notes?: string) {
  const order = await load(orderId);
  if (order.sellerId !== user.id) throw new HttpError(403, "Only the seller can confirm.");
  expect(order, "AWAITING_SELLER");
  await db.order.update({ where: { id: orderId }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
  if (notes?.trim()) await db.listing.update({ where: { id: order.listingId }, data: { sellerNotes: notes.trim() } });
  await note(orderId, user.id, "The seller confirmed, so the address and pickup instructions are now available.");
}

export async function sellerDecline(user: SessionUser, orderId: string) {
  const order = await load(orderId);
  if (order.sellerId !== user.id) throw new HttpError(403, "Only the seller can decline.");
  expect(order, "AWAITING_SELLER");
  await releaseHold(order);
  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "DECLINED", closedAt: new Date() } }),
    db.listing.update({ where: { id: order.listingId }, data: { status: "ACTIVE" } }),
  ]);
  await note(orderId, user.id, "The seller declined this order, so the payment was released and the buyer wasn't charged.");
}

export async function buyerCancel(user: SessionUser, orderId: string) {
  const order = await load(orderId);
  if (order.buyerId !== user.id) throw new HttpError(403, "Only the buyer can cancel.");
  expect(order, "AWAITING_SELLER");
  await releaseHold(order);
  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "CANCELLED", closedAt: new Date() } }),
    db.listing.update({ where: { id: order.listingId }, data: { status: "ACTIVE" } }),
  ]);
  await note(orderId, user.id, "The buyer cancelled before the seller confirmed, so the payment was released.");
}

// Capture the held money and pay the seller.
async function release(orderId: string, actorId: string, message: string) {
  const order = await load(orderId);
  if (!order.authorizationId) throw new HttpError(409, "There is no payment hold on this order.");
  const capture = await paypal.captureAuthorization(order.authorizationId, order.id);
  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", captureId: capture?.id ?? null, completedAt: new Date(), closedAt: new Date() },
    }),
    db.listing.update({ where: { id: order.listingId }, data: { status: "SOLD" } }),
  ]);
  await note(orderId, actorId, message);

  const receiver = order.seller.payoutReceiver || order.seller.email;
  try {
    const payout = await paypal.payoutSeller({
      orderId: order.id,
      cents: order.amount,
      wallet: order.seller.payoutWallet,
      receiver,
      title: order.listing.title,
    });
    await db.order.update({ where: { id: orderId }, data: { payoutBatchId: payout.batchId, payoutStatus: payout.status } });
    await note(orderId, actorId, `The seller has been paid to their ${order.seller.payoutWallet === "VENMO" ? "Venmo" : "PayPal"}.`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    await db.order.update({ where: { id: orderId }, data: { payoutStatus: `FAILED: ${reason}`.slice(0, 250) } });
    await note(orderId, actorId, "The payment went through, but the payout to the seller didn't, so our team will send it manually.");
  }
}

export async function gotIt(user: SessionUser, orderId: string) {
  const order = await load(orderId);
  if (order.buyerId !== user.id) throw new HttpError(403, "Only the buyer can confirm pickup.");
  expect(order, "CONFIRMED", "REPORTED_MISSING");
  await release(orderId, user.id, "The buyer picked up the item, so the payment is on its way to the seller.");
}

export async function notThere(user: SessionUser, orderId: string, text: string) {
  const order = await load(orderId);
  if (order.buyerId !== user.id) throw new HttpError(403, "Only the buyer can report this.");
  expect(order, "CONFIRMED");
  await db.order.update({
    where: { id: orderId },
    data: { status: "REPORTED_MISSING", reportedAt: new Date(), missingNote: text.trim() || null },
  });
  await note(
    orderId,
    user.id,
    `The buyer couldn't find the item.${text.trim() ? ` "${text.trim()}"` : ""} The seller has ${CONTEST_HOURS} hours to respond, or the buyer won't be charged.`,
  );
}

export async function contest(user: SessionUser, orderId: string, text: string, photo?: Buffer) {
  const order = await load(orderId);
  if (order.sellerId !== user.id) throw new HttpError(403, "Only the seller can contest.");
  expect(order, "REPORTED_MISSING");
  let contestPhotoId: string | null = null;
  if (photo) {
    const p = await db.photo.create({ data: { data: new Uint8Array(photo), orderId } });
    contestPhotoId = p.id;
  }
  await db.order.update({
    where: { id: orderId },
    data: { status: "DISPUTED", contestedAt: new Date(), contestNote: text.trim() || null, contestPhotoId },
  });
  await note(orderId, user.id, "The seller says the item was there, so our team will look into it.");
}

export async function adminResolve(admin: SessionUser, orderId: string, outcome: "release" | "refund", text?: string) {
  const order = await load(orderId);
  expect(order, "DISPUTED", "REPORTED_MISSING");
  await db.order.update({ where: { id: orderId }, data: { adminNote: text?.trim() || null } });
  if (outcome === "release") {
    await release(orderId, admin.id, "Our team reviewed this order and sent the payment to the seller.");
  } else {
    await releaseHold(order);
    await db.order.update({ where: { id: orderId }, data: { status: "REFUNDED", closedAt: new Date() } });
    await note(orderId, admin.id, "Our team reviewed this order and released the payment, so the buyer wasn't charged.");
  }
}

// Runs every few minutes from the cron job.
export async function tick(now = new Date()) {
  const log: string[] = [];
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const systemActor = async (o: Order) => o.sellerId;

  // Checkouts never approved.
  const stale = await db.order.updateMany({
    where: { status: "AWAITING_PAYMENT", createdAt: { lt: ago(HOUR) } },
    data: { status: "CANCELLED", closedAt: now },
  });
  if (stale.count) log.push(`cancelled ${stale.count} abandoned checkouts`);

  // Seller never answered.
  for (const o of await db.order.findMany({
    where: { status: "AWAITING_SELLER", authorizedAt: { lt: ago(SELLER_REPLY_HOURS * HOUR) } },
  })) {
    try {
      await releaseHold(o);
      await db.$transaction([
        db.order.update({ where: { id: o.id }, data: { status: "EXPIRED", closedAt: now } }),
        db.listing.update({ where: { id: o.listingId }, data: { status: "ACTIVE" } }),
      ]);
      await note(o.id, await systemActor(o), `The seller didn't confirm within ${SELLER_REPLY_HOURS} hours, so the payment was released.`);
      log.push(`expired ${o.id}`);
    } catch (err) {
      log.push(`expire ${o.id} failed: ${(err as Error).message}`);
    }
  }

  // Missing reports nobody contested.
  for (const o of await db.order.findMany({
    where: { status: "REPORTED_MISSING", reportedAt: { lt: ago(CONTEST_HOURS * HOUR) } },
  })) {
    try {
      await releaseHold(o);
      await db.$transaction([
        db.order.update({ where: { id: o.id }, data: { status: "REFUNDED", closedAt: now } }),
        db.listing.update({ where: { id: o.listingId }, data: { status: "ACTIVE" } }),
      ]);
      await note(o.id, o.buyerId, `The seller didn't respond within ${CONTEST_HOURS} hours, so the payment was released and the buyer wasn't charged.`);
      log.push(`refunded ${o.id}`);
    } catch (err) {
      log.push(`refund ${o.id} failed: ${(err as Error).message}`);
    }
  }

  // Renew holds once the 3-day honor period has passed (PayPal allows this from day 4 to day 29).
  for (const o of await db.order.findMany({
    where: { status: { in: HOLDING }, authorizationId: { not: null }, authorizedAt: { lt: ago(HONOR_PERIOD) } },
  })) {
    try {
      const fresh = await paypal.reauthorize(o.authorizationId!);
      await db.order.update({ where: { id: o.id }, data: { authorizationId: fresh, authorizedAt: now } });
      log.push(`renewed hold on ${o.id}`);
    } catch (err) {
      log.push(`renew ${o.id} failed: ${(err as Error).message}`);
    }
  }

  // Remind buyers who never tapped "Got it".
  for (const o of await db.order.findMany({
    where: { status: "CONFIRMED", nudgedAt: null, pickupAt: { lt: ago(24 * HOUR) } },
  })) {
    await db.order.update({ where: { id: o.id }, data: { nudgedAt: now } });
    await note(
      o.id,
      o.sellerId,
      `Did you pick it up? Tap Got it if you have the item, or Not there if it wasn't on the porch. If we don't hear back, the payment goes to the seller ${AUTO_RELEASE_HOURS} hours after the pickup time.`,
    );
    log.push(`nudged ${o.id}`);
  }

  // Buyer went silent after the pickup time: pay the seller.
  for (const o of await db.order.findMany({
    where: { status: "CONFIRMED", pickupAt: { lt: ago(AUTO_RELEASE_HOURS * HOUR) } },
  })) {
    try {
      await release(o.id, o.sellerId, "We didn't hear back from the buyer, so the payment was sent to the seller.");
      log.push(`auto-released ${o.id}`);
    } catch (err) {
      log.push(`auto-release ${o.id} failed: ${(err as Error).message}`);
    }
  }

  if (env.demo) {
    await refreshDemoDates();
    for (const title of await restockDemo(now)) log.push(`restocked ${title}`);
  }

  return log;
}

// Applies PayPal webhook events to orders we know about.
export async function applyWebhook(event: { event_type?: string; resource?: any }) {
  const type = event.event_type || "";
  const r = event.resource || {};
  if (type === "PAYMENT.AUTHORIZATION.VOIDED" && r.id) {
    const o = await db.order.findFirst({ where: { authorizationId: r.id } });
    if (o && HOLDING.includes(o.status) && o.status !== "DISPUTED") {
      await db.order.update({ where: { id: o.id }, data: { status: "REFUNDED", closedAt: new Date() } });
    }
  } else if (type.startsWith("PAYMENT.PAYOUTS-ITEM.") || type.startsWith("PAYMENT.PAYOUTSBATCH.")) {
    const batchId = r.payout_batch_id || r.batch_header?.payout_batch_id;
    const status = r.transaction_status || r.batch_header?.batch_status;
    if (batchId && status) await db.order.updateMany({ where: { payoutBatchId: batchId }, data: { payoutStatus: status } });
  }
}
