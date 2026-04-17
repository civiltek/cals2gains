// ============================================
// Cals2Gains - Promotional Codes
// ============================================
// Hardcoded list of redemption codes. When a user enters a valid code on
// the paywall, the entry is marked as consumed (friend codes only) and the
// user's subscription is unlocked via updateSubscriptionStatus.
//
// Master code → lifetime access (for Judith). Reusable.
// Friend codes → 1 year access. Each single-use.

export type PromoCodeType = 'master' | 'friend';

export interface PromoCode {
  code: string;
  type: PromoCodeType;
  /** Duration in days. Master codes use a very far expiry (≈100 years). */
  durationDays: number;
}

/** Lifetime reusable code for the owner. */
const MASTER_CODES: PromoCode[] = [
  { code: 'JUDITH-LIFETIME', type: 'master', durationDays: 365 * 100 },
];

/** Single-use friend codes, 1 year each. */
const FRIEND_CODES: PromoCode[] = [
  { code: 'C2G-AX7K2M', type: 'friend', durationDays: 365 },
  { code: 'C2G-BR4N9P', type: 'friend', durationDays: 365 },
  { code: 'C2G-DK8H3Q', type: 'friend', durationDays: 365 },
  { code: 'C2G-FM2V6T', type: 'friend', durationDays: 365 },
  { code: 'C2G-GJ5W8Y', type: 'friend', durationDays: 365 },
  { code: 'C2G-HL9R4Z', type: 'friend', durationDays: 365 },
  { code: 'C2G-KN3X7U', type: 'friend', durationDays: 365 },
  { code: 'C2G-PQ6B2E', type: 'friend', durationDays: 365 },
  { code: 'C2G-RS4D5F', type: 'friend', durationDays: 365 },
  { code: 'C2G-VW8C3G', type: 'friend', durationDays: 365 },
];

export const PROMO_CODES: PromoCode[] = [...MASTER_CODES, ...FRIEND_CODES];

/** Normalizes user input (trim + uppercase + strip surrounding whitespace). */
export function normalizePromoCode(input: string): string {
  return input.trim().toUpperCase();
}

export function findPromoCode(input: string): PromoCode | null {
  const norm = normalizePromoCode(input);
  return PROMO_CODES.find((c) => c.code === norm) ?? null;
}
