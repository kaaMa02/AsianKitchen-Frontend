import { MenuItemCategory } from '../types/api-types';

/**
 * Format a BigDecimal-like value to "CHF 0.00".
 * Accepts string or number and is defensive about bad input.
 */
export const formatChf = (raw: string | number): string => {
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? `CHF ${n.toFixed(2)}` : `CHF ${String(raw)}`;
};

/** Human labels for menu categories (UI) */
const LABELS: Record<MenuItemCategory, string> = {
  SUSHI_STARTER: 'Sushi Starter',
  SUSHI_ROLLS: 'Sushi Rolls',
  HOSO_MAKI: 'Hoso Maki',
  NIGIRI: 'Nigiri',
  TEMAKI: 'Temaki',
  SUSHI_PLATTEN: 'Sushi Platten',
  BOWLS: 'Bowls',
  DONBURI: 'Donburi',
  RAMEN_NOODLE: 'Ramen & Noodle',
  THAI_STARTER: 'Thai Starter',
  THAI_SUPPE: 'Thai Suppe',
  THAI_NOODLES: 'Thai Noodles',
  THAI_CURRY: 'Thai Curry',
  THAI_WOK: 'Thai Wok',
  SIDES: 'Sides',
  DESSERT: 'Dessert',
  DRINK: 'Drink',
};

export const categoryLabel = (c: MenuItemCategory): string => LABELS[c] ?? c;

/** Convert a user-entered price (e.g. "12.50") into integer cents (1250) */
export const toCents = (s: string | number): number => {
  const n = Number(String(s).replace(',', '.'));
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
};

/** Convert integer cents to a CHF string */
export const chf = (cents: number): string => `CHF ${(cents / 100).toFixed(2)}`;

/** Minimum order amount in cents (CHF 20.00) */
export const MIN_ORDER_CENTS = 2000;