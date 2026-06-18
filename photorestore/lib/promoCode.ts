export type PromoEntry = { code: string; daysUnlocked: number; feature: string }

export function getPromoCodes(): PromoEntry[] {
  try { return JSON.parse(process.env.PROMO_CODES ?? '[]') } catch { return [] }
}

export function validatePromoCode(input: string): PromoEntry | null {
  const codes = getPromoCodes()
  return codes.find(c => c.code.toLowerCase() === input.trim().toLowerCase()) ?? null
}
