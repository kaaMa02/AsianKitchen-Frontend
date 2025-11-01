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
  windowOpensAt?: string | null;
  windowClosesAt?: string | null;
  message: string;
}

/** Optional `at` (ISO) lets you pre-check a scheduled or ASAP+lead time */
export async function getHoursStatus(
  orderType: "DELIVERY" | "TAKEAWAY",
  at?: string
): Promise<HoursStatusDTO> {
  const res = await http.get(`/api/public/hours/status`, {
    params: { orderType, ...(at ? { at } : {}) },
  });
  return res.data as HoursStatusDTO;
}
