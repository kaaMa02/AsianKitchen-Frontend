import { MenuItemCategory } from '../types/api-types';

export const formatChf = (raw: string) => {
  const n = Number(raw);
  return isFinite(n) ? `CHF ${n.toFixed(2)}` : `CHF ${raw}`;
};

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

export const categoryLabel = (c: MenuItemCategory) => LABELS[c] ?? c;
