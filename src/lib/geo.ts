import { env } from "./env";

const EARTH_MILES = 3958.8;

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
}

export function roundMiles(miles: number) {
  return Math.max(0.1, Math.round(miles * 10) / 10);
}

// A point up to 400 m from the real one, in a random direction. Buyers only ever see this.
export function fuzzPoint(lat: number, lng: number) {
  const meters = 150 + Math.random() * 250;
  const angle = Math.random() * 2 * Math.PI;
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

// OpenStreetMap Nominatim. Free, one request per second, needs an identifying user agent.
export async function geocode(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  const res = await fetch(url, {
    headers: { "User-Agent": `porch-pickup/0.1 (${env.appUrl})`, "Accept-Language": "en" },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!rows.length) return null;
  return { lat: Number(rows[0].lat), lng: Number(rows[0].lon), label: rows[0].display_name };
}
