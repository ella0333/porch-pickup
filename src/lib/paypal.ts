import { env } from "./env";

// Server side calls to the PayPal REST API. Orders v2 for the hold,
// Payments v2 for capture / void / reauthorize, Payouts v1 to pay sellers.

const base = () =>
  env.paypalEnv === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let cached: { token: string; expires: number } | null = null;

async function accessToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const auth = Buffer.from(`${env.paypalClientId}:${env.paypalClientSecret}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const data = await res.json();
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

export class PayPalError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

async function call<T = any>(path: string, method: string, body?: unknown, requestId?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await accessToken()}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const res = await fetch(`${base()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const issue = data?.details?.[0]?.issue || data?.name || "";
    throw new PayPalError(res.status, data, `PayPal ${method} ${path} failed (${res.status}) ${issue}`.trim());
  }
  return data as T;
}

const usd = (cents: number) => ({ currency_code: "USD", value: (cents / 100).toFixed(2) });

// Creates an order that only places a hold when approved (intent AUTHORIZE).
// The same order works for the PayPal and the Venmo button; the v6 SDK picks the wallet.
export async function createHoldOrder(opts: { orderId: string; cents: number; title: string }) {
  return call<{ id: string; status: string }>(
    "/v2/checkout/orders",
    "POST",
    {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: opts.orderId,
          custom_id: opts.orderId,
          description: `Porch pickup: ${opts.title}`.slice(0, 127),
          amount: usd(opts.cents),
        },
      ],
    },
    `create-${opts.orderId}`,
  );
}

export async function authorizeOrder(paypalOrderId: string) {
  const data = await call(`/v2/checkout/orders/${paypalOrderId}/authorize`, "POST", {}, `auth-${paypalOrderId}`);
  const auth = data?.purchase_units?.[0]?.payments?.authorizations?.[0];
  const source = data?.payment_source ? Object.keys(data.payment_source)[0] : null;
  return { authorizationId: auth?.id as string, status: auth?.status as string, fundingSource: source };
}

export async function captureAuthorization(authorizationId: string, orderId: string) {
  return call(
    `/v2/payments/authorizations/${authorizationId}/capture`,
    "POST",
    { final_capture: true, invoice_id: `porch-${orderId}` },
    `capture-${orderId}`,
  );
}

export async function voidAuthorization(authorizationId: string) {
  try {
    await call(`/v2/payments/authorizations/${authorizationId}/void`, "POST");
  } catch (err) {
    // Already voided or expired authorizations cannot be voided again; the hold is gone either way.
    if (err instanceof PayPalError && err.status === 422) return;
    throw err;
  }
}

// Allowed from day 4 to day 29 after the original authorization.
export async function reauthorize(authorizationId: string) {
  const data = await call(`/v2/payments/authorizations/${authorizationId}/reauthorize`, "POST", {});
  return data.id as string;
}

export async function getAuthorization(authorizationId: string) {
  return call(`/v2/payments/authorizations/${authorizationId}`, "GET");
}

export async function payoutSeller(opts: {
  orderId: string;
  cents: number;
  wallet: "PAYPAL" | "VENMO";
  receiver: string;
  title: string;
}) {
  const isPhone = /^\+?[\d\s()-]{10,}$/.test(opts.receiver);
  const item: Record<string, unknown> = {
    amount: { value: (opts.cents / 100).toFixed(2), currency: "USD" },
    note: `Porch pickup sale: ${opts.title}`.slice(0, 4000),
    sender_item_id: opts.orderId,
    recipient_wallet: opts.wallet,
  };
  if (opts.wallet === "VENMO") {
    item.recipient_type = isPhone ? "PHONE" : "USER_HANDLE";
    item.receiver = isPhone ? opts.receiver.replace(/[^\d+]/g, "") : opts.receiver.replace(/^@/, "");
  } else {
    item.recipient_type = "EMAIL";
    item.receiver = opts.receiver;
  }
  const data = await call("/v1/payments/payouts", "POST", {
    sender_batch_header: {
      sender_batch_id: `porch-${opts.orderId}`,
      email_subject: "You were paid for a porch pickup",
      email_message: "Your buyer picked up the item. Here is your payment.",
    },
    items: [item],
  });
  return {
    batchId: data?.batch_header?.payout_batch_id as string,
    status: data?.batch_header?.batch_status as string,
  };
}

export async function verifyWebhook(headers: Headers, event: unknown) {
  if (!env.paypalWebhookId) return false;
  const data = await call("/v1/notifications/verify-webhook-signature", "POST", {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: env.paypalWebhookId,
    webhook_event: event,
  });
  return data?.verification_status === "SUCCESS";
}

export async function registerWebhook(url: string) {
  return call("/v1/notifications/webhooks", "POST", {
    url,
    event_types: [
      "PAYMENT.AUTHORIZATION.CREATED",
      "PAYMENT.AUTHORIZATION.VOIDED",
      "PAYMENT.CAPTURE.COMPLETED",
      "PAYMENT.CAPTURE.DENIED",
      "PAYMENT.CAPTURE.REFUNDED",
      "PAYMENT.PAYOUTSBATCH.SUCCESS",
      "PAYMENT.PAYOUTSBATCH.DENIED",
      "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
      "PAYMENT.PAYOUTS-ITEM.FAILED",
      "PAYMENT.PAYOUTS-ITEM.UNCLAIMED",
    ].map((name) => ({ name })),
  });
}
