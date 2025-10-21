// frontend/src/components/04_pages/Admin/AdminIncomingPage.tsx
import React from "react";
import {
  fetchNewCards,
  markSeen,
  confirmOrder,
  cancelOrder,
} from "../../../api/admin";
import { formatZurich } from "../../../utils/datetime";
import { NewOrderCardDTO } from "../../../types/api-types";
import { sound } from "../../../utils/audio";
import { markAlertsSeen } from "../../../services/alerts";

type Kind = "menu" | "buffet" | "reservation";

const BORDER = "#E6E3D6";
const MUTED = "#6b7280";
const AK_DARK = "#0B2D24";

export default function AdminIncomingPage() {
  const [cards, setCards] = React.useState<NewOrderCardDTO[]>([]);
  const [loadedOnce, setLoadedOnce] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [lastStatus, setLastStatus] = React.useState<string>("—");
  const [lastFetchAt, setLastFetchAt] = React.useState<number | null>(null);

  const prevIds = React.useRef<Set<string>>(new Set());
  const seenOnce = React.useRef<Set<string>>(new Set());
  const inflight = React.useRef<boolean>(false);

  React.useEffect(() => {
    const unlock = () => {
      sound.enable().catch(() => {});
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  React.useEffect(() => {
    markAlertsSeen(["orders", "buffet", "reservations"]).catch(() => {});
  }, []);

  React.useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const tick = async () => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        setLastError(null);
        const data = await fetchNewCards(ctrl.signal);
        if (aborted) return;

        setLastStatus("200");
        setLastFetchAt(Date.now());
        setLoadedOnce(true);

        const newIds = new Set(data.map((d) => `${d.kind}:${d.id}`));
        const oldIds = prevIds.current;

        for (const d of data) {
          const k = `${d.kind}:${d.id}`;
          if (!oldIds.has(k)) {
            sound.start(k);
            if (!seenOnce.current.has(k)) {
              seenOnce.current.add(k);
              markSeen(d.kind as Kind, d.id).catch(() => {});
            }
          }
        }

        oldIds.forEach((k) => {
          if (!newIds.has(k)) sound.stop(k);
        });

        setCards(data);
        prevIds.current = newIds;
      } catch (err: any) {
        const msg = err?.response?.status
          ? `${err.response.status} ${err.response.statusText || ""}`.trim()
          : err?.message || "Unknown error";
        setLastStatus(err?.response?.status ? String(err.response.status) : "ERR");
        setLastError(msg);
        console.error("[incoming] poll failed:", err);
      } finally {
        inflight.current = false;
      }
    };

    const handle = window.setInterval(tick, 2500);
    void tick();

    return () => {
      aborted = true;
      ctrl.abort();
      window.clearInterval(handle);
      sound.stopAll();
      prevIds.current.clear();
    };
  }, []);

  const onConfirm = async (c: NewOrderCardDTO, extraMinutes?: number) => {
    await confirmOrder(c.kind as Kind, c.id, extraMinutes);
    const key = `${c.kind}:${c.id}`;
    sound.stop(key);
    prevIds.current.delete(key);
    setCards((prev) => prev.filter((x) => !(x.kind === c.kind && x.id === c.id)));
  };

  const onCancel = async (c: NewOrderCardDTO) => {
    const reason = window.prompt("Reason (optional):") || "";
    await cancelOrder(c.kind as Kind, c.id, reason, false);
    const key = `${c.kind}:${c.id}`;
    sound.stop(key);
    prevIds.current.delete(key);
    setCards((prev) => prev.filter((x) => !(x.kind === c.kind && x.id === c.id)));
  };

  return (
    <div className="container" style={{ padding: "16px 20px" }}>
      <h1 style={{ marginBottom: 8 }}>Incoming (NEW)</h1>

      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        Status: <b>{lastStatus}</b>
        {" · "}Last fetch: {lastFetchAt ? new Date(lastFetchAt).toLocaleTimeString() : "—"}
        {lastError ? (
          <>
            {" · "}
            <span style={{ color: "#b91c1c" }}>Error: {lastError}</span>
          </>
        ) : null}
      </div>

      {loadedOnce && !cards.length && !lastError && (
        <div style={{ opacity: 0.7 }}>No new orders or reservations.</div>
      )}
      {!loadedOnce && !lastError && <div style={{ opacity: 0.7 }}>Connecting…</div>}
      {lastError && (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          Couldn’t load incoming cards. Check admin auth/CSRF/CORS and the /admin incoming endpoint.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
          gap: 16,
        }}
      >
        {cards.map((c) => (
          <Card
            key={`${c.kind}:${c.id}`}
            card={c}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  );
}

function Card(props: {
  card: NewOrderCardDTO;
  onConfirm: (c: NewOrderCardDTO, extraMinutes?: number) => void | Promise<void>;
  onCancel: (c: NewOrderCardDTO) => void | Promise<void>;
}) {
  const { card, onConfirm, onCancel } = props;

  const isOrder = card.kind === "menu" || card.kind === "buffet";
  const isASAP = !!card.timing.asap;

  // extra minutes bubbles (base 45; these are *extra* minutes)
  const EXTRA_CHOICES = [10, 15, 20, 30] as const;
  const [extra, setExtra] = React.useState<number>(card.timing.adminExtraMinutes ?? 0);

  const orderLabel =
    card.kind === "menu"
      ? `Order: ${String(card.orderType ?? "").toUpperCase()}`
      : card.kind === "buffet"
      ? `Buffet order: ${String(card.orderType ?? "").toUpperCase()}`
      : "Reservation";

  const titleLabel = (() => {
    if (card.kind === "reservation") return "Reservation";
    const mode = String(card.orderType ?? "").toUpperCase() === "DELIVERY" ? "Delivery" : "Takeaway";
    const req = isASAP
      ? "Now"
      : card.timing.requestedAt
      ? formatZurich(card.timing.requestedAt)
      : "—";
    return `${mode}: ${req}`;
  })();

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 14,
        background: "#fff",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>{orderLabel}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Created: <b>{formatZurich(card.createdAt)}</b>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{titleLabel}</div>

      <hr style={{ border: 0, borderTop: "1px solid #EFEBDD", margin: "6px 0 8px" }} />

      {/* Items first */}
      {card.kind !== "reservation" && card.menuItems?.length ? (
        <ItemsList
          title="Menu items"
          items={card.menuItems.map((i) => ({ name: i.menuItemName || "—", qty: i.quantity }))}
        />
      ) : null}
      {card.kind !== "reservation" && card.buffetItems?.length ? (
        <ItemsList
          title="Buffet items"
          items={card.buffetItems.map((i) => ({ name: i.name || "—", qty: i.quantity }))}
        />
      ) : null}

      {/* Customer */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
        <div style={{ fontWeight: 700 }}>
          {card.customerInfo.firstName} {card.customerInfo.lastName}
          {card.customerInfo.phone ? <span style={{ opacity: 0.7, fontWeight: 500 }}> · {card.customerInfo.phone}</span> : null}
        </div>
        {card.customerInfo.email ? (
          <div style={{ opacity: 0.8, fontSize: 13 }}>{card.customerInfo.email}</div>
        ) : null}
        {card.customerInfo.address && (
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            {card.customerInfo.address.street} {card.customerInfo.address.streetNo},{" "}
            {card.customerInfo.address.plz} {card.customerInfo.address.city}
          </div>
        )}
      </section>

      {/* Special instructions */}
      {!!card.specialInstructions && (
        <div
          style={{
            background: "#fff8e1",
            border: "1px solid #f7e2a4",
            color: "#7a5d00",
            padding: "8px 10px",
            borderRadius: 10,
            fontStyle: "italic",
          }}
        >
          {card.specialInstructions}
        </div>
      )}

      {/* ASAP extra-minute bubbles */}
      {isOrder && isASAP && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            padding: 10,
            border: `1px dashed ${BORDER}`,
            borderRadius: 10,
            background: "#faf9f3",
          }}
        >
          <div style={{ fontWeight: 700, marginRight: 8 }}>Add minutes</div>
          {EXTRA_CHOICES.map((n) => {
            const active = extra === n;
            return (
              <button
                key={n}
                onClick={() => setExtra(n)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${active ? AK_DARK : BORDER}`,
                  background: active ? AK_DARK : "#fff",
                  color: active ? "#EFE7CE" : AK_DARK,
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                +{n}
              </button>
            );
          })}
          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
            Base prep: <b>45 min</b> {extra ? `+ ${extra} = ~${45 + extra} min` : ""}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onConfirm(card, isOrder && isASAP ? extra : undefined)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid transparent",
            cursor: "pointer",
            fontWeight: 800,
            background: AK_DARK,
            color: "#EFE7CE",
          }}
          title={isOrder && isASAP ? `Confirm with +${extra} minutes` : "Confirm"}
        >
          Confirm
        </button>
        <button
          onClick={() => onCancel(card)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid transparent",
            cursor: "pointer",
            fontWeight: 800,
            background: "#ef4444",
            color: "#fff",
          }}
        >
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
    <div style={{ marginTop: 2 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div>{it.name}</div>
            <div style={{ textAlign: "right", color: MUTED }}>× {it.qty}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
