import { env } from "@/lib/env";
import { HttpError, requireAdmin } from "@/lib/auth";
import { route } from "@/lib/api";
import { seedDemo } from "@/lib/demo";
import { allow } from "@/lib/ratelimit";

export const POST = route(async (req: Request) => {
  if (!env.demo) throw new HttpError(404, "Not found.");
  await requireAdmin();
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!allow(`reset:${ip}`, 3, 10 * 60 * 1000)) throw new HttpError(429, "Reset was used a lot just now. Try again in a few minutes.");
  await seedDemo();
});
