import http from "./http";

export type DeliveryEligibility = {
  deliverable: boolean;
  message?: string | null;
  minOrderChf: number;
  feeChf: number;
  freeThresholdChf: number;
};

export async function checkDeliveryEligibility(
  orderType: "DELIVERY" | "TAKEAWAY",
  plz: string
): Promise<{ deliverable: boolean; message?: string }> {
  const { data } = await http.get("/api/public/delivery/eligibility", {
    params: { orderType, plz },
  });
  return data;
}
