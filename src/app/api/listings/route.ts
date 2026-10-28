import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { CATEGORIES } from "@/lib/format";

const Body = z.object({
  photoIds: z.array(z.string()).min(1).max(6),
  title: z.string().trim().min(3).max(90),
  description: z.string().trim().max(2000),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"]),
  conditionNotes: z.array(z.string().trim().max(80)).max(8),
  priceCents: z.number().int().min(100).max(10_000_00),
  suggestedPrice: z.number().int().nullable().optional(),
  priceReason: z.string().max(300).nullable().optional(),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (!user.pickupSpot) throw new HttpError(400, "Set up your pickup spot first.");
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Add a title, a category, a condition and a price of at least $1.");
  const b = parsed.data;

  const photos = await db.photo.findMany({ where: { id: { in: b.photoIds }, listingId: null, orderId: null } });
  if (!photos.length) throw new HttpError(400, "Those photos have expired. Upload them again.");

  const listing = await db.listing.create({
    data: {
      sellerId: user.id,
      title: b.title,
      description: b.description,
      category: b.category,
      condition: b.condition,
      conditionNotes: b.conditionNotes.filter(Boolean),
      price: b.priceCents,
      suggestedPrice: b.suggestedPrice ?? null,
      priceReason: b.priceReason ?? null,
    },
  });
  await Promise.all(
    b.photoIds.map((id, position) =>
      db.photo.updateMany({ where: { id, listingId: null, orderId: null }, data: { listingId: listing.id, position } }),
    ),
  );
  return { id: listing.id };
});
