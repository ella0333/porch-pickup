import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";

const Body = z.object({
  title: z.string().trim().min(3).max(90).optional(),
  description: z.string().trim().max(2000).optional(),
  priceCents: z.number().int().min(100).max(10_000_00).optional(),
  remove: z.boolean().optional(),
});

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) throw new HttpError(404, "Listing not found.");
  if (listing.sellerId !== user.id && user.role !== "ADMIN") throw new HttpError(403, "That's not your listing.");
  const b = Body.parse(await req.json());
  if (b.remove) {
    if (listing.status === "PENDING") throw new HttpError(409, "Someone is buying this right now. Decline the order first.");
    await db.listing.update({ where: { id }, data: { status: "REMOVED" } });
    return;
  }
  if (listing.status !== "ACTIVE") throw new HttpError(409, "Only active listings can be edited.");
  await db.listing.update({
    where: { id },
    data: { title: b.title, description: b.description, price: b.priceCents },
  });
});
