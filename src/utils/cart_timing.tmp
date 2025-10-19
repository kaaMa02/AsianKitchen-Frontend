// src/utils/cartTiming.ts
export function readCartTiming(): { asap?: boolean; scheduledAt?: string } {
  try {
    const raw = localStorage.getItem("ak.cartTiming");
    if (!raw) return { asap: true };
    const t = JSON.parse(raw) as { asap: boolean; scheduledAt: string | null };
    if (t.asap || !t.scheduledAt) return { asap: true };
    const d = new Date(t.scheduledAt);
    return { asap: false, scheduledAt: d.toISOString().replace("Z","").slice(0,19) };
  } catch {
    return { asap: true };
  }
}
