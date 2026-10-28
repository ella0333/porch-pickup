import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";

const Body = z.object({ stars: z.number().int().min(1).max(5), text: z.string().trim().max(500).optional() });

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const b = Body.parse(await req.json());
  const order = await db.order.findUnique({ where: { id } });
  if (!order || (order.buyerId !== user.id && order.sellerId !== user.id)) throw new HttpError(404, "Order not found.");
  // Reviews open once the sale finished, or when a no-show ended it.
  if (!["COMPLETED", "REFUNDED"].includes(order.status)) throw new HttpError(409, "You can review once the pickup is finished.");
  const targetId = order.buyerId === user.id ? order.sellerId : order.buyerId;
  const existing = await db.review.findUnique({ where: { orderId_authorId: { orderId: id, authorId: user.id } } });
  if (existing) throw new HttpError(409, "You already reviewed this sale.");
  await db.review.create({ data: { orderId: id, authorId: user.id, targetId, stars: b.stars, text: b.text || null } });
});
