import http from "./http";

export type AdminAlerts = {
  reservationsRequested: number;
  ordersNew: number;
  buffetOrdersNew: number;
};

export type AlertKind = "reservations" | "orders" | "buffet";

export async function getAdminAlerts(): Promise<AdminAlerts> {
  const { data } = await http.get<AdminAlerts>("/api/admin/alerts");
  return data;
}

/** Mark one or more buckets as seen (server zeros them). */
export async function markAlertsSeen(kinds: AlertKind | AlertKind[]) {
  const ks = Array.isArray(kinds) ? kinds : [kinds];
  await http.post("/api/admin/alerts/seen", { kinds: ks });
}
