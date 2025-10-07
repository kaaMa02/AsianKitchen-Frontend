import http from "./http";

export type HoursReason =
  | "OPEN"
  | "BEFORE_OPEN"
  | "BETWEEN_WINDOWS"
  | "AFTER_CLOSE"
  | "CLOSED_TODAY"
  | "CUTOFF_DELIVERY";

export interface HoursStatusDTO {
  openNow: boolean;
  reason: HoursReason;
  windowOpensAt?: string;   // ISO string
  windowClosesAt?: string;  // ISO string
  message: string;
}

export async function getHoursStatus(orderType: "DELIVERY" | "TAKEAWAY"): Promise<HoursStatusDTO> {
  const res = await http.get(`/api/public/hours/status`, { params: { orderType } });
  return res.data as HoursStatusDTO;
}
