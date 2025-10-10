import http from "./http";

export type DiscountConfigReadDTO = {
  id: string;
  enabled: boolean;
  percentMenu: number | string;
  percentBuffet: number | string;
  startsAt?: string | null; // ISO
  endsAt?: string | null;   // ISO
};

export type DiscountConfigWriteDTO = {
  enabled: boolean;
  percentMenu: number | string;
  percentBuffet: number | string;
  startsAt?: string | null;
  endsAt?: string | null;
};

export async function getDiscountConfig(): Promise<DiscountConfigReadDTO> {
  const { data } = await http.get("/api/admin/discounts/current");
  return data;
}

export async function updateDiscountConfig(
  dto: DiscountConfigWriteDTO
): Promise<DiscountConfigReadDTO> {
  const { data } = await http.put("/api/admin/discounts/current", dto);
  return data;
}

// existing public call (your cart/checkout uses this)
export type ActiveDiscountDTO = {
  percentMenu: number | string;
  percentBuffet: number | string;
};
export async function getActiveDiscount(): Promise<ActiveDiscountDTO> {
  const { data } = await http.get("/api/public/discounts/active");
  return data;
}