export const toCents = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return Math.round(n * 100);
};
export const chf = (cents: number) => `CHF ${(cents/100).toFixed(2)}`;
export const MIN_ORDER_CENTS = 2000;
