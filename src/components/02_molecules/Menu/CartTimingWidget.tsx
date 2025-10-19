// src/components/cart/CartTimingWidget.tsx
import * as React from "react";

type Timing = { asap: boolean; scheduledAt: string | null };
const KEY = "ak.cartTiming";

function load(): Timing {
  try { return JSON.parse(localStorage.getItem(KEY) || "") as Timing; }
  catch { return { asap: true, scheduledAt: null }; }
}
function save(t: Timing) { localStorage.setItem(KEY, JSON.stringify(t)); }

// Convert local 'YYYY-MM-DDTHH:mm' -> UTC wall string 'YYYY-MM-DDTHH:mm:ss' (no Z)
function toUtcLocalDateTimeString(localLike: string): string {
  if (!localLike) return "";
  const d = new Date(localLike);
  return d.toISOString().replace("Z","").slice(0,19);
}

// Suggest minimum datetime (now + 45m)
function minLocalDateTime(mins: number): string {
  const d = new Date(Date.now() + mins * 60000);
  const pad = (n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CartTimingWidget({
  defaultMinPrepMinutes = 45,
  onTimingChange,
}: {
  defaultMinPrepMinutes?: number;
  onTimingChange?: (payload: { asap: boolean; scheduledAt?: string }) => void;
}) {
  const [timing, setTiming] = React.useState<Timing>(() => load());

  React.useEffect(() => {
    save(timing);
    const payload = timing.asap
      ? { asap: true }
      : { asap: false, scheduledAt: toUtcLocalDateTimeString(timing.scheduledAt || "") };
    onTimingChange?.(payload);
  }, [timing, onTimingChange]);

  const minVal = minLocalDateTime(defaultMinPrepMinutes);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>When do you want it?</div>

      <label style={{ display: "block", marginBottom: 6 }}>
        <input
          type="radio"
          checked={timing.asap}
          onChange={() => setTiming({ asap: true, scheduledAt: null })}
        />{" "}
        ASAP (about {defaultMinPrepMinutes} min)
      </label>

      <label style={{ display: "block", marginBottom: 8 }}>
        <input
          type="radio"
          checked={!timing.asap}
          onChange={() => setTiming({ asap: false, scheduledAt: minVal })}
        />{" "}
        Schedule a time
      </label>

      {!timing.asap && (
        <div>
          <input
            type="datetime-local"
            value={timing.scheduledAt || ""}
            onChange={(e) => setTiming({ asap: false, scheduledAt: e.target.value })}
            min={minVal}
            step={900}
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
