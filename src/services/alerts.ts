import http from "./http";

export type AdminAlerts = {
  reservationsRequested: number;
  ordersNew: number;
  buffetOrdersNew: number;
};

export async function getAdminAlerts(): Promise<AdminAlerts> {
  const { data } = await http.get<AdminAlerts>("/api/admin/alerts");
  return data;
}
