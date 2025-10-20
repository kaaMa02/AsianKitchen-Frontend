import React from "react";
import {
  fetchNewCards,
  markSeen,
  confirmOrder,
  cancelOrder,
  patchTiming,
} from "../../../api/admin";
import { formatZurich } from "../../../utils/datetime";
import { NewOrderCardDTO } from "../../../types/api-types";
import { sound } from "../../../utils/audio";

type Kind = "menu" | "buffet" | "reservation";

export default function AdminIncomingPage() {
  const [cards, setCards] = React.useState<NewOrderCardDTO[]>([]);
  const seenOnce = React.useRef<Set<string>>(new Set()); // if you later want to re-enable markSeen
  const inflight = React.useRef<boolean>(false);

  // ✅ ensure audio can play on first gesture (works even if AdminLayout isn't mounted yet)
  React.useEffect(() => {
    const unlock = () => { sound.enable().catch(() => {}); };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // poll every 2500ms
  React.useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const tick = async () => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        const data = await fetchNewCards(ctrl.signal);
        if (aborted) return;

        // start/stop sounds based on appearance/disappearance
        const incomingIds = new Set(data.map((d) => d.kind + ":" + d.id));
        const oldIds = new Set(cards.map((d) => d.kind + ":" + d.id));

        // 🔊 new items → play sound
        for (const d of data) {
          const k = d.kind + ":" + d.id;
          if (!oldIds.has(k)) {
            sound.start(k);
            // If you want to mark 'seen' when the card FIRST appears, uncomment the next lines
            // if (!seenOnce.current.has(k)) {
            //   seenOnce.current.add(k);
            //   markSeen(d.kind as Kind, d.id).catch(() => {});
            // }
          }
        }

        // items that disappeared → stop sound
        for (const o of cards) {
          const k = o.kind + ":" + o.id;
          if (!incomingIds.has(k)) sound.stop(k);
        }

        setCards(data);
      } catch {
        // ignore transient errors
      } finally {
        inflight.current = false;
      }
    };

    const handle = window.setInterval(tick, 2500);
    tick();

    return () => {
      aborted = true;
      ctrl.abort();
      window.clearInterval(handle);
      sound.stopAll();
    };
  }, [cards]);

  const onConfirm = async (c: NewOrderCardDTO, extraMinutes?: number) => {
    // ✅ allow confirming reservations too (minutes are ignored for reservations server-side)
    await confirmOrder(c.kind as Kind, c.id, extraMinutes);
    sound.stop(c.kind + ":" + c.id);
    // optimistic remove
    setCards((prev) => prev.filter((x) => !(x.kind === c.kind && x.id === c.id)));
  };

  const onCancel = async (c: NewOrderCardDTO) => {
    const reason = window.prompt("Reason (optional):") || "";
    await cancelOrder(c.kind as Kind, c.id, reason, false);
    sound.stop(c.kind + ":" + c.id);
    setCards((prev) => prev.filter((x) => !(x.kind === c.kind && x.id === c.id)));
  };

  const onSaveMinutes = async (c: NewOrderCardDTO, mins: number) => {
    if (c.kind === "reservation") return;
    await patchTiming(c.kind as Extract<Kind, "menu" | "buffet">, c.id, mins);
    // next poll will update committedReadyAt
  };

  return (
    <div className="container" style={{ padding: "16px 20px" }}>
      <h1 style={{ marginBottom: 16 }}>Incoming (NEW)</h1>

      {!cards.length && (
        <div style={{ opacity: 0.7 }}>No new orders or reservations.</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
          gap: 16,
        }}
      >
        {cards.map((c) => (
          <Card
            key={c.kind + ":" + c.id}
            card={c}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onSaveMinutes={onSaveMinutes}
          />
        ))}
      </div>
    </div>
  );
}

function Card(props: {
  card: NewOrderCardDTO;
  onConfirm: (
    c: NewOrderCardDTO,
    extraMinutes?: number
  ) => void | Promise<void>;
  onCancel: (c: NewOrderCardDTO) => void | Promise<void>;
  onSaveMinutes: (c: NewOrderCardDTO, mins: number) => void | Promise<void>;
}) {
  const { card, onConfirm, onCancel, onSaveMinutes } = props;
  const [mins, setMins] = React.useState<number>(
    card.timing.adminExtraMinutes ?? 0
  );

  const isOrder = card.kind === "menu" || card.kind === "buffet";
  const isASAP = !!card.timing.asap;
  const canAdjust = isOrder && isASAP; // admin can add minutes only if ASAP

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 14,
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <strong style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          {badge(card)}
        </strong>
        <div style={{ opacity: 0.7 }}>
          Created: {formatZurich(card.createdAt)}
        </div>
      </div>

      <section style={{ marginBottom: 8 }}>
        <div>
          <strong>
            {card.customerInfo.firstName} {card.customerInfo.lastName}
          </strong>{" "}
          · {card.customerInfo.phone}
        </div>
        <div style={{ opacity: 0.8 }}>{card.customerInfo.email}</div>
        {card.customerInfo.address && (
          <div style={{ opacity: 0.8 }}>
            {card.customerInfo.address.street}{" "}
            {card.customerInfo.address.streetNo},{" "}
            {card.customerInfo.address.plz} {card.customerInfo.address.city}
          </div>
        )}
      </section>

      {!!card.specialInstructions && (
        <div style={{ fontStyle: "italic", marginBottom: 8 }}>
          {card.specialInstructions}
        </div>
      )}

      {card.kind !== "reservation" &&
        card.buffetItems &&
        card.buffetItems.length > 0 && (
          <ItemsList
            title="Buffet items"
            items={card.buffetItems.map((i) => ({
              name: i.name || "—",
              qty: i.quantity,
            }))}
          />
        )}

      <section style={{ marginTop: 8, marginBottom: 12 }}>
        {isASAP ? (
          <div>
            Ready about:{" "}
            <strong>
              {formatZurich(card.timing.committedReadyAt || card.createdAt)}
            </strong>
          </div>
        ) : card.kind === "reservation" ? (
          <div>
            Time:{" "}
            <strong>
              {formatZurich(
                card.timing.committedReadyAt || card.timing.requestedAt!
              )}
            </strong>
          </div>
        ) : (
          <div>
            Requested: <strong>{formatZurich(card.timing.requestedAt!)}</strong>
          </div>
        )}
      </section>

      {canAdjust && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <label style={{ fontWeight: 600 }}>Add minutes:</label>
          <input
            type="number"
            min={0}
            step={5}
            value={mins}
            onChange={(e) => setMins(Math.max(0, Number(e.target.value ?? 0)))}
            style={{ width: 90, padding: "6px 8px" }}
          />
          <button onClick={() => onSaveMinutes(card, mins)} style={linkBtn}>
            Save
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {/* ✅ show Confirm for reservations too */}
        <button
          onClick={() => onConfirm(card, canAdjust ? mins : undefined)}
          style={primaryBtn}
        >
          Confirm
        </button>
        <button onClick={() => onCancel(card)} style={dangerBtn}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ItemsList({
  title,
  items,
}: {
  title: string;
  items: { name: string; qty: number }[];
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((it, i: number) => (
          <li key={i}>
            {it.name} · x {it.qty}
          </li>
        ))}
      </ul>
    </div>
  );
}

function badge(c: NewOrderCardDTO) {
  if (c.kind === "menu") return `menu · ${c.orderType}`;
  if (c.kind === "buffet") return "buffet";
  return "reservation";
}

const baseBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid transparent",
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: "#0ea5e9",
  color: "#fff",
};
const dangerBtn: React.CSSProperties = {
  ...baseBtn,
  background: "#ef4444",
  color: "#fff",
};
const linkBtn: React.CSSProperties = {
  ...baseBtn,
  background: "transparent",
  color: "#0ea5e9",
  borderColor: "#0ea5e9",
};
