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
import { markAlertsSeen, type AlertKind } from "../../../services/alerts";
import { getCustomerOrder } from "../../../services/customerOrders";
import { getBuffetOrder } from "../../../services/buffetOrders";
import { printCustomerOrderReceipt } from "../../../services/printing";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";

type Kind = "menu" | "buffet" | "reservation";

const BORDER = "#E6E3D6";
const MUTED = "#6b7280";
const AK_DARK = "#0B2D24";
const SHOW_DEBUG = false;

const bucketFor = (k: Kind): AlertKind =>
  k === "menu" ? "orders" : k === "buffet" ? "buffet" : "reservations";

export default function AdminIncomingPage() {
  const [cards, setCards] = React.useState<NewOrderCardDTO[]>([]);
  const [loadedOnce, setLoadedOnce] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [lastStatus, setLastStatus] = React.useState<string>("—");
  const [lastFetchAt, setLastFetchAt] = React.useState<number | null>(null);

  const { silence } = useAdminAlerts();

  const [showMenu, setShowMenu] = React.useState(true);
  const [showBuffet, setShowBuffet] = React.useState(true);
  const [showReservations, setShowReservations] = React.useState(true);

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
    silence();
  }, [silence]);

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
              markAlertsSeen(bucketFor(d.kind as Kind))
                .then(() => silence())
                .catch(() => {});
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
        setLastStatus(
          err?.response?.status ? String(err.response.status) : "ERR"
        );
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
      silence(); // <- ensure cadence is muted on unmount
    };
  }, [silence]);

  const removeCard = React.useCallback(
    (kind: string, id: string) => {
      const key = `${kind}:${id}`;
      sound.stop(key);
      prevIds.current.delete(key);
      setCards((prev) =>
        prev.filter((x) => !(x.kind === kind && String(x.id) === id))
      );
      setTimeout(() => {
        if (!prevIds.current.size) {
          sound.stopAll();
          silence();
        }
      }, 0);
    },
    [silence]
  );

  const onConfirm = async (c: NewOrderCardDTO, extraMinutes?: number) => {
    await confirmOrder(c.kind as Kind, c.id, extraMinutes, true);
    try {
      if (c.kind === "menu") {
        const full = await getCustomerOrder(String(c.id));
        await printCustomerOrderReceipt(full as any);
      } else if (c.kind === "buffet") {
        const full = await getBuffetOrder(String(c.id));
        await printCustomerOrderReceipt(full as any);
      }
    } catch {}
    try {
      await markAlertsSeen(bucketFor(c.kind as Kind));
    } finally {
      silence();
    }
    removeCard(c.kind, String(c.id));
  };

  const onCancel = async (c: NewOrderCardDTO) => {
    const reason = window.prompt("Reason (optional):") || "";
    await cancelOrder(c.kind as Kind, c.id, reason, false);
    try {
      await markAlertsSeen(bucketFor(c.kind as Kind));
    } finally {
      silence();
    }
    removeCard(c.kind, String(c.id));
  };

  const filtered = cards.filter((c) =>
    c.kind === "menu"
      ? showMenu
      : c.kind === "buffet"
      ? showBuffet
      : showReservations
  );

  return (
    <div className="container" style={{ padding: "16px 20px" }}>
      <h1 style={{ marginBottom: 8 }}>Incoming (NEW)</h1>

      {SHOW_DEBUG && (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Status: <b>{lastStatus}</b>
          {" · "}
          Last fetch:{" "}
          {lastFetchAt ? new Date(lastFetchAt).toLocaleTimeString() : "—"}
          {lastError && (
            <>
              {" · "}
              <span style={{ color: "#b91c1c" }}>Error: {lastError}</span>
            </>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <span style={{ fontWeight: 600, color: "#374151", marginRight: 4 }}>
          Show:
        </span>
        <Toggle
          label="Menu orders"
          active={showMenu}
          onClick={() => setShowMenu((v) => !v)}
        />
        <Toggle
          label="Buffet orders"
          active={showBuffet}
          onClick={() => setShowBuffet((v) => !v)}
        />
        <Toggle
          label="Reservations"
          active={showReservations}
          onClick={() => setShowReservations((v) => !v)}
        />
      </div>

      {loadedOnce && !filtered.length && !lastError && (
        <div style={{ opacity: 0.7 }}>No new orders or reservations.</div>
      )}
      {!loadedOnce && !lastError && (
        <div style={{ opacity: 0.7 }}>Connecting…</div>
      )}
      {lastError && (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          Couldn’t load incoming cards. Check admin auth/CSRF/CORS and the
          /admin incoming endpoint.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
          gap: 12,
        }}
      >
        {filtered.map((c) => (
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

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        border: `1px solid ${active ? "#9ca3af" : "#d1d5db"}`,
        background: active ? "#f3f4f6" : "#fff",
        color: "#374151",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}

function Card(props: {
  card: NewOrderCardDTO;
  onConfirm: (
    c: NewOrderCardDTO,
    extraMinutes?: number
  ) => void | Promise<void>;
  onCancel: (c: NewOrderCardDTO) => void | Promise<void>;
}) {
  const { card, onConfirm, onCancel } = props;

  const isOrder = card.kind === "menu" || card.kind === "buffet";
  const isASAP = !!card.timing.asap;

  const EXTRA_CHOICES = [10, 15, 20, 30] as const;
  const [extra, setExtra] = React.useState<number>(
    card.timing.adminExtraMinutes ?? 0
  );

  const orderValue =
    card.kind === "reservation"
      ? "Reservation"
      : String(card.orderType ?? "").toUpperCase();

  const deliverValue = (() => {
    if (card.kind === "reservation")
      return formatZurich(card.timing.committedReadyAt);
    if (isASAP) return "Now";
    return card.timing.requestedAt
      ? formatZurich(card.timing.requestedAt)
      : "—";
  })();

  const tint =
    card.kind === "menu"
      ? "#fff8ee"
      : card.kind === "buffet"
      ? "#eefaf3"
      : "#eef3ff";
  const accent =
    card.kind === "menu"
      ? "#f59e0b"
      : card.kind === "buffet"
      ? "#22c55e"
      : "#3b82f6";

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: 12,
        background: tint,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ fontSize: 14 }}>
          <span style={{ opacity: 0.85 }}>Order:</span>{" "}
          <span style={{ fontWeight: 800 }}>{orderValue}</span>
        </div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>
          Created: <b>{formatZurich(card.createdAt)}</b>
        </div>
      </div>
      <div style={{ fontSize: 15 }}>
        <span style={{ opacity: 0.85 }}>Delivery:</span>{" "}
        <span style={{ fontWeight: 800 }}>{deliverValue}</span>
      </div>

      <hr
        style={{
          border: 0,
          borderTop: "1px solid #EFEBDD",
          margin: "6px 0 6px",
        }}
      />

      {card.kind !== "reservation" && card.menuItems?.length ? (
        <ItemsList
          title="Menu items"
          items={card.menuItems.map((i) => ({
            name: i.menuItemName || "—",
            qty: i.quantity,
          }))}
        />
      ) : null}
      {card.kind !== "reservation" && card.buffetItems?.length ? (
        <ItemsList
          title="Buffet items"
          items={card.buffetItems.map((i) => ({
            name: i.name || "—",
            qty: i.quantity,
          }))}
        />
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 4,
          background: "#ffffffb8",
          border: `1px dashed ${BORDER}`,
          borderRadius: 10,
          padding: 8,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Customer info</div>
        <Row label="Name">
          {card.customerInfo.firstName} {card.customerInfo.lastName}
        </Row>
        <Row label="Phone Nr.">{card.customerInfo.phone || "—"}</Row>
        <Row label="Address">
          {card.customerInfo.address
            ? `${card.customerInfo.address.street} ${
                card.customerInfo.address.streetNo ?? ""
              }, ${card.customerInfo.address.plz ?? ""} ${
                card.customerInfo.address.city ?? ""
              }`.trim()
            : "—"}
        </Row>
      </section>

      {!!card.specialInstructions && (
        <div
          style={{
            background: "#fff8e1",
            border: "1px solid #f7e2a4",
            color: "#7a5d00",
            padding: "6px 8px",
            borderRadius: 10,
            fontStyle: "italic",
          }}
        >
          {card.specialInstructions}
        </div>
      )}

      {isOrder && isASAP && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            padding: 8,
            border: `1px dashed ${BORDER}`,
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 700, marginRight: 8 }}>Add minutes</div>
          {[10, 15, 20, 30].map((n) => {
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
            Prep base: <b>45 min</b>{" "}
            {extra ? `+ ${extra} = ~${45 + extra} min` : ""}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 2,
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => onConfirm(card, isOrder && isASAP ? extra : undefined)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid transparent",
            cursor: "pointer",
            fontWeight: 800,
            background: "#16a34a",
            color: "#fff",
          }}
          title={
            isOrder && isASAP ? `Confirm with +${extra} minutes` : "Confirm"
          }
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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "108px 1fr",
        gap: 8,
        fontSize: 13,
      }}
    >
      <div style={{ color: MUTED }}>{label}:</div>
      <div>{children}</div>
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
    <div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4 }}
      >
        {items.map((it, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div style={{ fontSize: 13 }}>{it.name}</div>
            <div style={{ textAlign: "right", color: MUTED }}>× {it.qty}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
