import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { body } = z.object({ body: z.string().trim().min(1).max(1000) }).parse(await req.json());
  const order = await db.order.findUnique({ where: { id } });
  if (!order || (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== "ADMIN")) {
    throw new HttpError(404, "Order not found.");
  }
  if (order.status === "AWAITING_PAYMENT") throw new HttpError(409, "Messages open once the payment is held.");
  await db.message.create({ data: { orderId: id, authorId: user.id, body } });
});
