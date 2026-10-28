import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { startOrder } from "@/lib/orders";

const Body = z.object({ listingId: z.string(), date: z.string(), minute: z.number().int() });

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const b = Body.parse(await req.json());
  return startOrder(user, b.listingId, b.date, b.minute);
});
