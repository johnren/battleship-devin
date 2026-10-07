/** Seed from `?seed=<number>`, or null if absent/invalid. */
export function seedFromUrl(search: string): number | null {
  const raw = new URLSearchParams(search).get('seed')
  if (raw === null || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? Math.trunc(n) >>> 0 : null
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}
