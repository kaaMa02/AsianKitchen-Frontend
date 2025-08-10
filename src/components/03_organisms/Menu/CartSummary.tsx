import { chf, MIN_ORDER_CENTS } from "../../../utils/money";

export default function CartSummary({ totalCents }: { totalCents: number }) {
  const missing = Math.max(0, MIN_ORDER_CENTS - totalCents);
  return (
    <div>
      <div>Total: {chf(totalCents)}</div>
      {missing > 0 && <div style={{ color: '#C88C1A' }}>Add {chf(missing)} more to reach the minimum order.</div>}
    </div>
  );
}
