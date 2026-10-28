import { env } from "./env";
import { CATEGORIES } from "./format";

// Photo to listing with an open-weight vision model (Llama 4 Scout) through OpenRouter,
// routed to the cheapest provider serving it.

export type ListingDraft = {
  title: string;
  description: string;
  category: string;
  brand: string | null;
  model: string | null;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
  flaws: string[];
  searchQuery: string;
};

const CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"] as const;

const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "category", "brand", "model", "condition", "flaws", "searchQuery"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string", enum: CATEGORIES },
    brand: { type: ["string", "null"] },
    model: { type: ["string", "null"] },
    condition: { type: "string", enum: [...CONDITIONS] },
    flaws: { type: "array", items: { type: "string" } },
    searchQuery: { type: "string" },
  },
};

const DRAFT_PROMPT = `You write listings for a local secondhand marketplace where buyers pick items up from the seller's porch.
Look at every photo and return JSON with:
- title: under 70 characters, brand and model first when visible, no hype words.
- description: 2 to 4 plain sentences a buyer needs (what it is, size or capacity if visible, what is included, notable wear).
- category: one of ${CATEGORIES.join(", ")}.
- brand and model: only if readable in the photos, otherwise null.
- condition: grade only from what the photos show.
  NEW = sealed or tags attached. LIKE_NEW = no visible wear. GOOD = light normal wear.
  FAIR = obvious wear, scratches, stains or fading but works. POOR = damaged, missing parts or heavy wear.
- flaws: short phrases for each visible flaw ("scuff on lid", "faded seat fabric"). Empty if none.
- searchQuery: 3 to 7 words someone would type on eBay to find this exact item.
Return only the JSON object.`;

async function chat(messages: unknown[], schema?: { name: string; schema: unknown }, maxTokens = 600) {
  if (!env.openrouterKey) throw new Error("OPENROUTER_API_KEY is not set.");
  const body: Record<string, unknown> = {
    model: env.openrouterModel,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
    provider: { sort: "price" },
  };
  if (schema) {
    body.response_format = { type: "json_schema", json_schema: { name: schema.name, strict: true, schema: schema.schema } };
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.appUrl,
      "X-Title": "Porch Pickup",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}) ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? "");
}

function parseJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The AI reply had no JSON in it.");
  return JSON.parse(text.slice(start, end + 1));
}

export async function draftListing(jpegs: Buffer[]): Promise<ListingDraft> {
  const content: unknown[] = [{ type: "text", text: DRAFT_PROMPT }];
  for (const jpg of jpegs) {
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpg.toString("base64")}` } });
  }
  const raw = parseJson(await chat([{ role: "user", content }], { name: "listing", schema: draftSchema }));
  const condition = CONDITIONS.includes(raw.condition) ? raw.condition : "GOOD";
  return {
    title: String(raw.title || "Item").slice(0, 90),
    description: String(raw.description || ""),
    category: CATEGORIES.includes(raw.category) ? raw.category : "Other",
    brand: raw.brand ? String(raw.brand) : null,
    model: raw.model ? String(raw.model) : null,
    condition,
    flaws: Array.isArray(raw.flaws) ? raw.flaws.map(String).slice(0, 8) : [],
    searchQuery: String(raw.searchQuery || raw.title || ""),
  };
}

// Last resort when neither price source returned anything.
export async function estimatePrice(draft: ListingDraft, jpeg: Buffer): Promise<number | null> {
  const prompt = `Estimate a fair local resale price in US dollars for this item in ${draft.condition.replace("_", " ").toLowerCase()} condition.
Item: ${draft.title}. ${draft.flaws.length ? "Visible flaws: " + draft.flaws.join(", ") + "." : ""}
Think of what it sells for used on Facebook Marketplace or eBay. Return JSON {"usd": number}.`;
  try {
    const text = await chat(
      [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } },
          ],
        },
      ],
      {
        name: "price",
        schema: { type: "object", additionalProperties: false, required: ["usd"], properties: { usd: { type: "number" } } },
      },
      60,
    );
    const usd = Number(parseJson(text).usd);
    return Number.isFinite(usd) && usd > 0 ? Math.round(usd * 100) : null;
  } catch {
    return null;
  }
}
