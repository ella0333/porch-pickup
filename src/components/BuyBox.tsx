"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { dateLabel } from "@/lib/time";
import type { Slot } from "@/lib/time";

declare global {
  interface Window {
    paypal?: any;
  }
}

type Props = {
  listingId: string;
  slots: Slot[];
  clientId: string;
  sdkUrl: string;
  sandbox: boolean;
};

let sdkPromise: Promise<void> | null = null;
function loadSdk(src: string) {
  if (window.paypal?.createInstance) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        sdkPromise = null;
        reject(new Error("Couldn't load PayPal. Check your connection and refresh."));
      };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

export default function BuyBox({ listingId, slots, clientId, sdkUrl, sandbox }: Props) {
  const days = useMemo(() => [...new Set(slots.map((s) => s.date))], [slots]);
  const [day, setDay] = useState(days[0] ?? "");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [ready, setReady] = useState<{ paypal: boolean; venmo: boolean }>({ paypal: false, venmo: false });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const slotRef = useRef<Slot | null>(null);
  const sessions = useRef<{ paypal?: any; venmo?: any }>({});
  slotRef.current = slot;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSdk(sdkUrl);
        const sdk = await window.paypal.createInstance({
          clientId,
          components: ["paypal-payments", "venmo-payments"],
          pageType: "checkout",
          ...(sandbox ? { testBuyerCountry: "US" } : {}),
        });
        const methods = await sdk.findEligibleMethods({ currencyCode: "USD" });
        const options = {
          onApprove: async (data: { orderId: string }) => {
            setStatus("Just a moment...");
            try {
              const res = await api<{ orderId: string }>("/api/orders/approve", { paypalOrderId: data.orderId });
              window.location.href = `/orders/${res.orderId}`;
            } catch (err) {
              setStatus("");
              setError((err as Error).message);
            }
          },
          onCancel: () => setStatus(""),
          onError: (err: Error) => {
            setStatus("");
            setError(err?.message || "PayPal had a problem. Nothing was charged.");
          },
        };
        if (cancelled) return;
        const next = { paypal: false, venmo: false };
        if (methods.isEligible("paypal")) {
          sessions.current.paypal = sdk.createPayPalOneTimePaymentSession(options);
          next.paypal = true;
        }
        if (methods.isEligible("venmo")) {
          sessions.current.venmo = sdk.createVenmoOneTimePaymentSession(options);
          next.venmo = true;
        }
        setReady(next);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Couldn't load PayPal.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, sdkUrl, sandbox]);

  async function createOrder() {
    const s = slotRef.current;
    if (!s) throw new Error("Pick a pickup time first.");
    const res = await api<{ paypalOrderId: string }>("/api/orders", { listingId, date: s.date, minute: s.minute });
    return { orderId: res.paypalOrderId };
  }

  async function pay(kind: "paypal" | "venmo") {
    setError("");
    if (!slotRef.current) return setError("Pick a pickup time first.");
    const session = sessions.current[kind];
    if (!session) return;
    try {
      // Don't await createOrder before start(): the popup needs the click's user activation.
      const orderPromise = createOrder();
      await session.start({ presentationMode: "auto" }, orderPromise);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!slots.length) {
    return <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">The seller has no pickup times open right now.</p>;
  }

  const daySlots = slots.filter((s) => s.date === day);

  return (
    <div className="space-y-4">
      <div>
        <p className="label">Pick a pickup day</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDay(d);
                setSlot(null);
              }}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${d === day ? "border-brand bg-brand-soft font-semibold text-brand-dark" : "border-line bg-card"}`}
            >
              {dateLabel(d)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">About when you'll stop by</p>
        <div className="grid grid-cols-2 gap-1.5">
          {daySlots.map((s) => {
            const on = slot?.date === s.date && slot.minute === s.minute;
            return (
              <button
                key={`${s.date}-${s.minute}`}
                type="button"
                onClick={() => setSlot(s)}
                className={`rounded-lg border px-2 py-2 text-xs ${on ? "border-brand bg-brand-soft font-semibold text-brand-dark" : "border-line bg-card"}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`space-y-2 ${slot ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!slot}>
        <paypal-button type="pay" hidden={!ready.paypal} onClick={() => pay("paypal")} />
        <venmo-button type="pay" hidden={!ready.venmo} onClick={() => pay("venmo")} />
        {!ready.paypal && !ready.venmo && !error && <p className="text-sm text-muted">Loading PayPal...</p>}
      </div>
      {!slot && <p className="text-xs text-muted">Choose a pickup time to continue.</p>}
      {status && <p className="text-sm text-brand">{status}</p>}
      {error && <p className="text-sm text-bad">{error}</p>}
      <p className="text-xs text-muted">
        Your payment is held until you pick up the item, so you&apos;re only charged once it&apos;s in your hands.
      </p>
    </div>
  );
}
