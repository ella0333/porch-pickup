import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { approveOrder } from "@/lib/orders";

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { paypalOrderId } = z.object({ paypalOrderId: z.string() }).parse(await req.json());
  const order = await approveOrder(user, paypalOrderId);
  return { orderId: order.id };
});
