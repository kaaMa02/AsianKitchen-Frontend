// src/api/admin.ts

import { NewOrderCardDTO, UUID } from "../types/api-types";

const BASE = "/api/admin";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchNewCards(
  signal?: AbortSignal
): Promise<NewOrderCardDTO[]> {
  const res = await fetch(`${BASE}/orders/new`, {
    credentials: "include",
    signal,
  });
  return json<NewOrderCardDTO[]>(res);
}

// mark seen
export async function markSeen(
  kind: "menu"|"buffet"|"reservation", 
  id: UUID
): Promise<void> {
  await fetch(`${BASE}/${kind}-orders/${id}/seen`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).then((r) => {
    if (!r.ok) throw new Error(`seen ${r.status}`);
  });
}

// patch extra minutes (ASAP only)
export async function patchTiming(
  kind: "menu" | "buffet",
  id: UUID,
  adminExtraMinutes: number
): Promise<void> {
  await fetch(`${BASE}/${kind}-orders/${id}/timing`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminExtraMinutes }),
  }).then((r) => {
    if (!r.ok) throw new Error(`timing ${r.status}`);
  });
}

// confirm
export async function confirmOrder(
  // ✅ allow reservations too
  kind: "menu" | "buffet" | "reservation",
  id: UUID,
  extraMinutes?: number,
  print?: boolean
): Promise<void> {
  await fetch(`${BASE}/${kind}-orders/${id}/confirm`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ print: !!print, extraMinutes }),
  }).then((r) => {
    if (!r.ok) throw new Error(`confirm ${r.status}`);
  });
}


// cancel (menu|buffet|reservation)
export async function cancelOrder(
  kind: "menu" | "buffet" | "reservation",
  id: UUID,
  reason?: string,
  refundIfPaid?: boolean
): Promise<void> {
  await fetch(`${BASE}/${kind}-orders/${id}/cancel`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: reason || "",
      refundIfPaid: !!refundIfPaid,
    }),
  }).then((r) => {
    if (!r.ok) throw new Error(`cancel ${r.status}`);
  });
}
