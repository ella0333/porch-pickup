import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, checkPassword, startSession } from "@/lib/auth";
import { route } from "@/lib/api";

const Body = z.object({ email: z.string().trim().toLowerCase(), password: z.string() });

export const POST = route(async (req: Request) => {
  const { email, password } = Body.parse(await req.json());
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await checkPassword(password, user.passwordHash))) throw new HttpError(401, "Wrong email or password.");
  if (user.banned) throw new HttpError(403, "This account has been banned.");
  await startSession(user.id);
});
