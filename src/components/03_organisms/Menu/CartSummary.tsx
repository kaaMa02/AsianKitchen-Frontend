import { chf, MIN_DELIVERY_ORDER_CENTS } from "../../../utils/money";
import type { OrderType } from "../../../types/api-types";

export default function CartSummary({
  totalCents,
  orderType,
}: {
  totalCents: number;
  orderType: OrderType;
}) {
  const min = orderType === "DELIVERY" ? MIN_DELIVERY_ORDER_CENTS : 0;
  const missing = Math.max(0, min - totalCents);

  return (
    <div>
      <div>Total: {chf(totalCents)}</div>
      {missing > 0 && (
        <div style={{ color: "#C88C1A" }}>
          Add {chf(missing)} more to reach the minimum delivery order (CHF 30.00).
        </div>
      )}
    </div>
  );
}
