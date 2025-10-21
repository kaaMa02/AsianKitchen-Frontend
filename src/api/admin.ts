// src/api/admin.ts
import http from "../services/http";
import { NewOrderCardDTO, UUID } from "../types/api-types";

const BASE = "/api/admin";

/** NEW cards (menu, buffet, reservations) */
export async function fetchNewCards(signal?: AbortSignal): Promise<NewOrderCardDTO[]> {
  const res = await http.get<NewOrderCardDTO[]>(`${BASE}/orders/new`, {
    signal,
    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
    validateStatus: (s) => s < 500, // let 4xx bubble with message
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`${res.status} Unauthorized — admin cookie/CSRF/CORS`);
  }
  if (res.status !== 200 || !Array.isArray(res.data)) {
    throw new Error(`Unexpected response (${res.status})`);
  }
  return res.data;
}

/** Mark seen */
export async function markSeen(
  kind: "menu" | "buffet" | "reservation",
  id: UUID
): Promise<void> {
  await http.post(`${BASE}/${kind}-orders/${id}/seen`, {}, {
    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
  });
}

/** Patch extra minutes (ASAP only) */
export async function patchTiming(
  kind: "menu" | "buffet",
  id: UUID,
  adminExtraMinutes: number
): Promise<void> {
  await http.patch(
    `${BASE}/${kind}-orders/${id}/timing`,
    { adminExtraMinutes },
    { headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" } }
  );
}

/** Confirm (menu | buffet | reservation) */
export async function confirmOrder(
  kind: "menu" | "buffet" | "reservation",
  id: UUID,
  extraMinutes?: number,
  print?: boolean
): Promise<void> {
  await http.post(
    `${BASE}/${kind}-orders/${id}/confirm`,
    { print: !!print, extraMinutes },
    { headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" } }
  );
}

/** Cancel (menu | buffet | reservation) */
export async function cancelOrder(
  kind: "menu" | "buffet" | "reservation",
  id: UUID,
  reason?: string,
  refundIfPaid?: boolean
): Promise<void> {
  await http.post(
    `${BASE}/${kind}-orders/${id}/cancel`,
    { reason: reason || "", refundIfPaid: !!refundIfPaid },
    { headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" } }
  );
}
