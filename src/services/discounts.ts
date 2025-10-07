import http from "./http";

export type ActiveDiscountDTO = {
  percentMenu: string | number;
  percentBuffet: string | number;
};

export async function getActiveDiscount(): Promise<ActiveDiscountDTO> {
  const { data } = await http.get("/api/public/discounts/active");
  return data;
}
