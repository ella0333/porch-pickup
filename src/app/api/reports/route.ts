import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";

const Body = z.object({
  userId: z.string().optional(),
  listingId: z.string().optional(),
  reason: z.string().trim().min(3).max(500),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const b = Body.parse(await req.json());
  if (!b.userId && !b.listingId) throw new HttpError(400, "Nothing to report.");
  if (b.userId === user.id) throw new HttpError(400, "You can't report yourself.");
  await db.report.create({
    data: { reporterId: user.id, reportedUserId: b.userId ?? null, listingId: b.listingId ?? null, reason: b.reason },
  });
});
