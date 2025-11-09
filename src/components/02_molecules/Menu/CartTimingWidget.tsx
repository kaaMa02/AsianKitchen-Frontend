// src/components/cart/CartTimingWidget.tsx
import * as React from "react";
import { CartTiming, localInputToWallNoZ, readCartTiming, toLocalInputValue, writeCartTiming } from "../../../utils/cartTiming";

type Props = {
  /** Server min prep, used for the default/min time suggestion */
  defaultMinPrepMinutes?: number;
  /** Optional callback if the parent also wants to react */
  onTimingChange?: (payload: { asap: boolean; scheduledAt?: string }) => void;
};

export default function CartTimingWidget({
  defaultMinPrepMinutes = 45,
  onTimingChange,
}: Props) {
  const [timing, setTiming] = React.useState<CartTiming>(() => readCartTiming());

  // Min selectable: now + prep (rounded to minute, no seconds)
  const minDate = React.useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + defaultMinPrepMinutes);
    d.setSeconds(0, 0);
    return d;
  }, [defaultMinPrepMinutes]);

  const minLocal = toLocalInputValue(minDate);

  // Commit -> save LS, fire event, optional callback
  const commit = (next: CartTiming) => {
    setTiming(next);
    writeCartTiming(next);
    // Keep the external payload shape you've been using (no Z)
    onTimingChange?.(next.asap ? { asap: true } : { asap: false, scheduledAt: next.scheduledAt || undefined });
  };

  const selectASAP = () => {
    commit({ asap: true, scheduledAt: null });
  };

  const selectSchedule = () => {
    // Initial pick defaults to minLocal
    const wall = localInputToWallNoZ(minLocal);
    commit({ asap: false, scheduledAt: wall });
  };

  const changeSchedule = (localValue: string) => {
    const wall = localInputToWallNoZ(localValue);
    commit({ asap: false, scheduledAt: wall || null });
  };

  // Derive the input value: if we have a saved wall string, show it as 'datetime-local'
  const inputValue = React.useMemo(() => {
    if (!timing.scheduledAt) return minLocal;
    const d = new Date(timing.scheduledAt); // wall string parses as local
    if (isNaN(d.getTime())) return minLocal;
    return toLocalInputValue(d);
  }, [timing.scheduledAt, minLocal]);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>When do you want it?</div>

      <label style={{ display: "block", marginBottom: 6 }}>
        <input type="radio" checked={timing.asap} onChange={selectASAP} />{" "}
        ASAP (about {defaultMinPrepMinutes} min)
      </label>

      <label style={{ display: "block", marginBottom: 8 }}>
        <input type="radio" checked={!timing.asap} onChange={selectSchedule} />{" "}
        Schedule a time
      </label>

      {!timing.asap && (
        <div>
          <input
            type="datetime-local"
            value={inputValue}
            min={minLocal}
            step={900}
            onChange={(e) => changeSchedule(e.target.value)}
            style={{ padding: "6px 8px" }}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            We’ll aim to be ready at your selected time.
          </div>
        </div>
      )}
    </div>
  );
}
