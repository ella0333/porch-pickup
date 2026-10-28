import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { route } from "@/lib/api";
import { adminResolve } from "@/lib/orders";
import { voidAuthorization } from "@/lib/paypal";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resolve"),
    orderId: z.string(),
    outcome: z.enum(["release", "refund"]),
    note: z.string().optional(),
  }),
  z.object({ action: z.literal("ban"), userId: z.string(), banned: z.boolean() }),
  z.object({ action: z.literal("closeReport"), reportId: z.string() }),
  z.object({ action: z.literal("removeListing"), listingId: z.string() }),
]);

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin();
  const b = Body.parse(await req.json());
  switch (b.action) {
    case "resolve":
      return adminResolve(admin, b.orderId, b.outcome, b.note);
    case "ban": {
      await db.user.update({ where: { id: b.userId }, data: { banned: b.banned } });
      if (b.banned) {
        // Open sales involving a banned user are cancelled and every hold released.
        const open = await db.order.findMany({
          where: {
            OR: [{ sellerId: b.userId }, { buyerId: b.userId }],
            status: { in: ["AWAITING_SELLER", "CONFIRMED"] },
          },
        });
        for (const o of open) {
          if (o.authorizationId) await voidAuthorization(o.authorizationId);
          await db.order.update({ where: { id: o.id }, data: { status: "CANCELLED", closedAt: new Date() } });
          await db.listing.update({
            where: { id: o.listingId },
            data: { status: o.sellerId === b.userId ? "REMOVED" : "ACTIVE" },
          });
        }
        await db.listing.updateMany({ where: { sellerId: b.userId, status: "ACTIVE" }, data: { status: "REMOVED" } });
      }
      return;
    }
    case "closeReport":
      await db.report.update({ where: { id: b.reportId }, data: { resolved: true } });
      return;
    case "removeListing":
      await db.listing.update({ where: { id: b.listingId }, data: { status: "REMOVED" } });
      return;
  }
});
