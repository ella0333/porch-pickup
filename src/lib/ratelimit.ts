// Small in-memory limiter, enough to stop one visitor burning the AI budget.
const hits = new Map<string, number[]>();

export function allow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}
