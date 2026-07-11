const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, maxPerHour: number): { ok: boolean } {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const existing = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (existing.length >= maxPerHour) {
    hits.set(key, existing);
    return { ok: false };
  }
  existing.push(now);
  hits.set(key, existing);
  return { ok: true };
}
