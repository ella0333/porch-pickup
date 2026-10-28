import { env } from "./env";
import { estimatePrice, type ListingDraft } from "./ai";
import { money } from "./format";

// Price suggestion from the AI's condition grade plus two market sources:
// eBay Browse API (used asking prices, when keys exist) and Channel3 (new and used offers by photo).

type Used = { p25: number; p50: number; p75: number; count: number };

let ebayToken: { token: string; expires: number } | null = null;

async function ebayAccessToken() {
  if (ebayToken && ebayToken.expires > Date.now() + 60_000) return ebayToken.token;
  const auth = Buffer.from(`${env.ebayClientId}:${env.ebayClientSecret}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  if (!res.ok) throw new Error(`eBay auth failed (${res.status})`);
  const data = await res.json();
  ebayToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return ebayToken.token;
}

function percentile(sorted: number[], p: number) {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
}

export async function ebayUsedPrices(query: string): Promise<Used | null> {
  if (!env.ebayClientId || !env.ebayClientSecret || !query.trim()) return null;
  try {
    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "50");
    url.searchParams.set("filter", "conditions:{USED},itemLocationCountry:US,buyingOptions:{FIXED_PRICE|BEST_OFFER}");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${await ebayAccessToken()}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const prices = ((data.itemSummaries || []) as { price?: { value?: string; currency?: string } }[])
      .filter((i) => i.price?.currency === "USD")
      .map((i) => Math.round(Number(i.price!.value) * 100))
      .filter((c) => c > 0)
      .sort((a, b) => a - b);
    if (prices.length < 3) return null;
    // Drop the top and bottom 10% so one odd listing doesn't skew the range.
    const trim = Math.floor(prices.length * 0.1);
    const core = prices.slice(trim, prices.length - trim);
    return { p25: percentile(core, 0.25), p50: percentile(core, 0.5), p75: percentile(core, 0.75), count: prices.length };
  } catch {
    return null;
  }
}

// One Channel3 image search returns new retail offers and, where Channel3 has them,
// used and pre-owned offers from resale sites.
export async function channel3Prices(jpeg: Buffer): Promise<{ retail: { cents: number; title: string } | null; used: Used | null }> {
  const none = { retail: null, used: null };
  if (!env.channel3Key) return none;
  try {
    const res = await fetch("https://api.trychannel3.com/v1/image-search", {
      method: "POST",
      headers: { "x-api-key": env.channel3Key, "Content-Type": "application/json" },
      body: JSON.stringify({
        base64_image: jpeg.toString("base64"),
        limit: 10,
        segment: "AUTO",
        filters: { conditions: ["new", "used"] },
      }),
    });
    if (!res.ok) return none;
    const data = await res.json();
    type Offer = { price?: { price?: number; currency?: string }; condition?: string | null };
    const candidates: { cents: number; title: string }[] = [];
    const usedPrices: number[] = [];
    for (const [i, product] of (data.products || []).slice(0, 5).entries()) {
      const offers = ((product.offers || []) as Offer[]).filter((o) => o.price?.currency === "USD" && Number(o.price?.price) > 0);
      for (const o of offers) if (o.condition === "used") usedPrices.push(Math.round(Number(o.price!.price) * 100));
      // New prices only from the closest three matches.
      const fresh = offers.filter((o) => (o.condition ?? "new") === "new");
      if (i < 3 && fresh.length) {
        candidates.push({ cents: Math.round(Math.min(...fresh.map((o) => Number(o.price!.price))) * 100), title: String(product.title || "") });
      }
    }
    // Median of the top matches, so one wrong match doesn't decide the price.
    candidates.sort((a, b) => a.cents - b.cents);
    const retail = candidates.length ? candidates[Math.floor(candidates.length / 2)] : null;
    usedPrices.sort((a, b) => a - b);
    const used =
      usedPrices.length >= 2
        ? { p25: percentile(usedPrices, 0.25), p50: percentile(usedPrices, 0.5), p75: percentile(usedPrices, 0.75), count: usedPrices.length }
        : null;
    return { retail, used };
  } catch {
    return none;
  }
}

const USED_PICK: Record<ListingDraft["condition"], (u: Used) => number> = {
  NEW: (u) => u.p75,
  LIKE_NEW: (u) => u.p75,
  GOOD: (u) => u.p50,
  FAIR: (u) => u.p25,
  POOR: (u) => Math.round(u.p25 * 0.6),
};

const NEW_SHARE: Record<ListingDraft["condition"], number> = {
  NEW: 0.85,
  LIKE_NEW: 0.7,
  GOOD: 0.55,
  FAIR: 0.4,
  POOR: 0.25,
};

// Rounds to prices people actually ask: $1 under $20, $5 under $100, $10 above.
export function friendly(cents: number) {
  const dollars = cents / 100;
  const step = dollars < 20 ? 1 : dollars < 100 ? 5 : 10;
  return Math.max(100, Math.round(dollars / step) * step * 100);
}

export async function suggestPrice(draft: ListingDraft, mainJpeg: Buffer) {
  const [ebay, c3] = await Promise.all([ebayUsedPrices(draft.searchQuery), channel3Prices(mainJpeg)]);
  // eBay has the most used listings; Channel3's resale offers fill in without it.
  const used = ebay ?? c3.used;
  const usedWhere = ebay ? "on eBay" : "on resale sites";
  const retail = c3.retail;

  let cents: number | null = null;
  if (draft.condition === "NEW" && retail) cents = Math.round(retail.cents * NEW_SHARE.NEW);
  else if (used) cents = USED_PICK[draft.condition](used);
  else if (retail) cents = Math.round(retail.cents * NEW_SHARE[draft.condition]);
  if (cents && retail) cents = Math.min(cents, Math.round(retail.cents * 0.85));

  let source = "market";
  if (!cents) {
    cents = await estimatePrice(draft, mainJpeg);
    source = "ai";
  }
  if (!cents) return { cents: null, reason: "No price data found for this item. Set your own price." };

  const parts = [`${draft.condition === "LIKE_NEW" ? "Like new" : draft.condition[0] + draft.condition.slice(1).toLowerCase()} condition${draft.flaws.length ? ", " + draft.flaws.slice(0, 2).join(", ") : ""}.`];
  if (used) parts.push(`Used ones listed ${money(used.p25)} to ${money(used.p75)} ${usedWhere}.`);
  if (retail) parts.push(`About ${money(retail.cents)} new.`);
  if (source === "ai") parts.push("Estimated by AI from the photos.");
  return { cents: friendly(cents), reason: parts.join(" "), used, retail };
}
