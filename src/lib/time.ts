// Pickup slots live in the seller's time zone; everything is stored in UTC.

function tzOffsetMinutes(utc: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - utc.getTime()) / 60000;
}

// "2026-10-24" + 540 minutes in America/New_York -> the matching UTC instant.
export function zonedToUtc(date: string, minute: number, timeZone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, Math.floor(minute / 60), minute % 60));
  const offset = tzOffsetMinutes(guess, timeZone);
  const first = new Date(guess.getTime() - offset * 60000);
  const offset2 = tzOffsetMinutes(first, timeZone);
  return offset2 === offset ? first : new Date(guess.getTime() - offset2 * 60000);
}

export function todayIn(timeZone: string, from = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(from);
}

export function minuteLabel(minute: number) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

export function dateLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function whenLabel(at: Date, timeZone: string) {
  return at.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

// Holds last 29 days, so pickups can be at most 28 days out.
export const MAX_DAYS_AHEAD = 28;

export type Slot = { date: string; minute: number; label: string };

// One-hour pickup slots inside the seller's window, starting at least an hour from now.
export function pickupSlots(spot: { dates: string[]; startMinute: number; endMinute: number; timezone: string }, now = new Date()) {
  const earliest = now.getTime() + 60 * 60 * 1000;
  const latest = now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  const slots: Slot[] = [];
  for (const date of [...spot.dates].sort()) {
    for (let minute = spot.startMinute; minute + 60 <= spot.endMinute; minute += 60) {
      const at = zonedToUtc(date, minute, spot.timezone).getTime();
      if (at < earliest || at > latest) continue;
      slots.push({ date, minute, label: `${minuteLabel(minute)} to ${minuteLabel(minute + 60)}` });
    }
  }
  return slots;
}
