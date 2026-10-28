import { HttpError } from "@/lib/auth";
import { route } from "@/lib/api";
import { geocode } from "@/lib/geo";
import { allow } from "@/lib/ratelimit";

// Turns a buyer's zip code or town into a point to sort the feed from.
export const GET = route(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) throw new HttpError(400, "Enter a zip code or town.");
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!allow(`geo:${ip}`, 20, 60 * 1000)) throw new HttpError(429, "Too many lookups. Wait a minute.");
  const hit = await geocode(q);
  if (!hit) throw new HttpError(404, "We couldn't find that place.");
  return { lat: Math.round(hit.lat * 1000) / 1000, lng: Math.round(hit.lng * 1000) / 1000, label: hit.label };
});
