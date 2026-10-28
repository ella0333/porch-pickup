import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, hashPassword, startSession } from "@/lib/auth";
import { route } from "@/lib/api";

const Body = z.object({
  name: z.string().trim().min(1).max(40),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const POST = route(async (req: Request) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Enter a name, a valid email and a password of at least 8 characters.");
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) throw new HttpError(409, "That email already has an account.");
  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password), payoutReceiver: email } });
  await startSession(user.id);
});
