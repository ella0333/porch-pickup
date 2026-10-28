import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { fuzzPoint, geocode } from "@/lib/geo";

const Body = z.object({
  address: z.string().trim().min(5).max(200),
  instructions: z.string().trim().min(3).max(500),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(60),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(60).max(1440),
  timezone: z.string().min(3).max(60),
  payoutWallet: z.enum(["PAYPAL", "VENMO"]),
  payoutReceiver: z.string().trim().min(3).max(127),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Fill in every field, and pick at least one pickup date.");
  const b = parsed.data;
  if (b.endMinute - b.startMinute < 60) throw new HttpError(400, "The pickup window must be at least an hour long.");
  if (b.payoutWallet === "PAYPAL" && !z.string().email().safeParse(b.payoutReceiver).success) {
    throw new HttpError(400, "Enter the email address of your PayPal account.");
  }

  const existing = await db.pickupSpot.findUnique({ where: { userId: user.id } });
  let coords = existing && existing.address === b.address ? { lat: existing.lat, lng: existing.lng } : null;
  let publicPoint = existing && coords ? { lat: existing.publicLat, lng: existing.publicLng } : null;
  if (!coords) {
    const hit = await geocode(b.address);
    if (!hit) throw new HttpError(400, "We couldn't find that address on the map. Check the street, city and zip.");
    coords = { lat: hit.lat, lng: hit.lng };
    publicPoint = fuzzPoint(hit.lat, hit.lng);
  }

  const data = {
    address: b.address,
    lat: coords.lat,
    lng: coords.lng,
    publicLat: publicPoint!.lat,
    publicLng: publicPoint!.lng,
    instructions: b.instructions,
    dates: [...new Set(b.dates)].sort(),
    startMinute: b.startMinute,
    endMinute: b.endMinute,
    timezone: b.timezone,
  };
  await db.$transaction([
    db.pickupSpot.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data }),
    db.user.update({
      where: { id: user.id },
      data: { payoutWallet: b.payoutWallet, payoutReceiver: b.payoutReceiver, homeLat: coords.lat, homeLng: coords.lng },
    }),
  ]);
});
