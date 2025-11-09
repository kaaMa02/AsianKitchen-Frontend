// src/utils/cartTiming.ts

export type CartTiming = {
  asap: boolean;
  /** Stored as a "UTC wall" string without Z, e.g. 2025-01-31T18:30:00 */
  scheduledAt: string | null;
};

const KEY = "ak.cartTiming";

/** Make TS aware of our custom event */
declare global {
  interface WindowEventMap {
    "ak:cartTiming": CustomEvent<CartTiming>;
  }
}

/** Read timing from LS. Defaults to ASAP. Normalizes scheduledAt to 'YYYY-MM-DDTHH:mm:ss' (no Z). */
export function readCartTiming(): CartTiming {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { asap: true, scheduledAt: null };

    const t = JSON.parse(raw) as Partial<CartTiming>;
    if (t?.asap === true) return { asap: true, scheduledAt: null };

    // If user had a 'datetime-local' value or any parseable thing, normalize it
    const src = t?.scheduledAt ?? "";
    if (!src) return { asap: false, scheduledAt: null };

    const d = new Date(src);
    if (isNaN(d.getTime())) return { asap: false, scheduledAt: null };

    // Keep "UTC wall" string without Z (backend expects LocalDateTime)
    const wall = d.toISOString().replace("Z", "").slice(0, 19);
    return { asap: false, scheduledAt: wall };
  } catch {
    return { asap: true, scheduledAt: null };
  }
}

/** Persist + broadcast a change so other parts (CartDrawer) react instantly. */
export function writeCartTiming(next: CartTiming) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<CartTiming>("ak:cartTiming", { detail: next }));
}

/** Helper: build a 'datetime-local' value from a Date */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Helper: convert a 'datetime-local' string to our "UTC wall" no-Z string */
export function localInputToWallNoZ(localLike: string): string {
  if (!localLike) return "";
  const d = new Date(localLike); // parsed in the browser's local tz
  return d.toISOString().replace("Z", "").slice(0, 19);
}
