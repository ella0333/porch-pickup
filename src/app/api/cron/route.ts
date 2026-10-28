import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { tick } from "@/lib/orders";

// Called every few minutes by the Render cron job with the shared secret.
export async function POST(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const log = await tick();
  return NextResponse.json({ ok: true, log });
}
