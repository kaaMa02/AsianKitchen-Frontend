// src/utils/cartTiming.ts

export type CartTiming = {
  asap: boolean;
  /** Stored as a "UTC wall" string without Z, e.g. 2025-11-09T19:30:00 */
  scheduledAt: string | null;
};

const KEY = "ak.cartTiming";

/** Let TS know about our custom event for timing changes */
declare global {
  interface WindowEventMap {
    "ak:cartTiming": CustomEvent<CartTiming>;
  }
}

/** Read from localStorage and normalize to our wall-noZ format */
export function readCartTiming(): CartTiming {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { asap: true, scheduledAt: null };
    const t = JSON.parse(raw) as Partial<CartTiming>;

    if (t?.asap === true) return { asap: true, scheduledAt: null };

    const src = t?.scheduledAt ?? "";
    if (!src) return { asap: false, scheduledAt: null };

    const d = new Date(src);
    if (isNaN(d.getTime())) return { asap: false, scheduledAt: null };

    // normalize -> "YYYY-MM-DDTHH:mm:ss" (no Z)
    const wall = d.toISOString().replace("Z", "").slice(0, 19);
    return { asap: false, scheduledAt: wall };
  } catch {
    return { asap: true, scheduledAt: null };
  }
}

/** Persist and broadcast so listeners (CartDrawer) update immediately */
export function writeCartTiming(next: CartTiming) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<CartTiming>("ak:cartTiming", { detail: next }));
}

/** Build a value suitable for <input type="datetime-local"> */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Convert a 'datetime-local' string into our wall-noZ string */
export function localInputToWallNoZ(localLike: string): string {
  if (!localLike) return "";
  const d = new Date(localLike); // parsed as local tz
  return d.toISOString().replace("Z", "").slice(0, 19);
}
