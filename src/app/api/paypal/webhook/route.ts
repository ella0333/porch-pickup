import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/paypal";
import { applyWebhook } from "@/lib/orders";

// PayPal webhook. Events are only applied after PayPal confirms the signature.
export async function POST(req: Request) {
  const event = await req.json();
  try {
    if (!(await verifyWebhook(req.headers, event))) {
      return NextResponse.json({ error: "signature not verified" }, { status: 400 });
    }
    await applyWebhook(event);
  } catch (err) {
    console.error("webhook", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
