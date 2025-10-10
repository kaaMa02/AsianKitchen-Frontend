import http from "./http";

export type ActiveDiscountDTO = {
  percentMenu: string | number;
  percentBuffet: string | number;
};

export type DiscountConfigReadDTO = {
  id: string;
  enabled: boolean;
  percentMenu: number | string;   // backend returns numbers (or strings), we normalize
  percentBuffet: number | string;
  startsAt?: string | null;       // ISO string or null
  endsAt?: string | null;         // ISO string or null
};

export type DiscountConfigWriteDTO = {
  enabled: boolean;
  percentMenu: number;
  percentBuffet: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

// public
export async function getActiveDiscount(): Promise<ActiveDiscountDTO> {
  const { data } = await http.get("/api/public/discounts/active");
  return data;
}

// admin
// GET current config
export async function getDiscountConfig(): Promise<DiscountConfigReadDTO> {
  const { data } = await http.get("/api/admin/discounts/current");
  return data;
}

// PUT update
export async function updateDiscountConfig(
  payload: DiscountConfigWriteDTO
): Promise<DiscountConfigReadDTO> {
  const { data } = await http.put("/api/admin/discounts/current", payload);
  return data;
}