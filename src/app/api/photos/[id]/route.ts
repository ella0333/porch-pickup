import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const photo = await db.photo.findUnique({ where: { id } });
  if (!photo) return new Response("Not found", { status: 404 });

  // Contest photos belong to an order and are only shown to its buyer, seller and admins.
  if (photo.orderId) {
    const user = await currentUser();
    const order = await db.order.findUnique({ where: { id: photo.orderId } });
    const allowed = user && order && (user.role === "ADMIN" || user.id === order.buyerId || user.id === order.sellerId);
    if (!allowed) return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": photo.orderId ? "private, max-age=3600" : "public, max-age=31536000, immutable",
    },
  });
}
