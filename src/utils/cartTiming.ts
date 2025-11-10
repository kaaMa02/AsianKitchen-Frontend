// src/utils/cartTiming.ts

export type CartTiming = {
  asap: boolean;
  /** Local wall time, no timezone, e.g. 2025-11-10T17:30:00 */
  scheduledAt: string | null;
};

const KEY = "ak.cartTiming";

/** Let TS know about our custom event for timing changes */
declare global {
  interface WindowEventMap {
    "ak:cartTiming": CustomEvent<CartTiming>;
  }
}

/** Helpers */
const pad = (n: number) => String(n).padStart(2, "0");

/** Normalize any "datetime-local" or Date-parsable value to local wall (no Z) with seconds */
export function normalizeWallNoZ(src: string): string {
  if (!src) return "";
  // Accept "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  const m = src.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) return `${m[1]}T${m[2]}:${m[3]}:${m[4] ?? "00"}`;

  // Fallback: try Date parse (interpreted as local) and rebuild WITHOUT converting to UTC
  const d = new Date(src);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Read from localStorage WITHOUT converting to UTC */
export function readCartTiming(): CartTiming {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { asap: true, scheduledAt: null };
    const t = JSON.parse(raw) as Partial<CartTiming>;
    if (t?.asap === true) return { asap: true, scheduledAt: null };
    const wall = normalizeWallNoZ(t?.scheduledAt ?? "");
    return { asap: false, scheduledAt: wall || null };
  } catch {
    return { asap: true, scheduledAt: null };
  }
}

/** Persist + broadcast so listeners (drawer/checkout) refresh immediately */
export function writeCartTiming(next: CartTiming) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent<CartTiming>("ak:cartTiming", { detail: next })
  );
}

/** Value suitable for <input type="datetime-local"> from a Date (kept in LOCAL time) */
export function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Convert a 'datetime-local' value to local wall (no Z), keeping the chosen clock time */
export function localInputToWallNoZ(localLike: string): string {
  return normalizeWallNoZ(localLike);
}

/** Convert a wall-noZ string (local clock) into an ISO instant with Z for the backend */
export function wallNoZToISOZ(wall: string): string {
  // new Date(wall) treats it as local; toISOString() converts to UTC Z once.
  return new Date(wall).toISOString();
}
