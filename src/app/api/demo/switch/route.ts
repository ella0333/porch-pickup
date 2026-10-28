import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError, startSession } from "@/lib/auth";
import { route } from "@/lib/api";

export const POST = route(async (req: Request) => {
  if (!env.demo) throw new HttpError(404, "Not found.");
  const { userId } = z.object({ userId: z.string() }).parse(await req.json());
  const user = await db.user.findFirst({ where: { id: userId, isDemo: true, role: "USER" } });
  if (!user) throw new HttpError(404, "Demo user not found.");
  if (user.banned) await db.user.update({ where: { id: user.id }, data: { banned: false } });
  await startSession(user.id);
});
