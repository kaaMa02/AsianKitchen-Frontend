import * as React from "react";
import {
  AdminAlerts,
  getAdminAlerts,
  markAlertsSeen,
  AlertKind,
} from "../services/alerts";

type Ctx = {
  alerts: AdminAlerts;
  refresh: () => Promise<void>;
  markSeen: (kinds: AlertKind | AlertKind[]) => Promise<void>;
};

const AlertsContext = React.createContext<Ctx | null>(null);

export function useAdminAlerts() {
  const ctx = React.useContext(AlertsContext);
  if (!ctx)
    throw new Error("useAdminAlerts must be used within <AdminAlertsProvider>");
  return ctx;
}

export function AdminAlertsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alerts, setAlerts] = React.useState<AdminAlerts>({
    reservationsRequested: 0,
    ordersNew: 0,
    buffetOrdersNew: 0,
  });

  const lastTotal = React.useRef(0);
  const audio = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    audio.current = new Audio("/notify.mp3");
  }, []);

  const refresh = React.useCallback(async () => {
    const a = await getAdminAlerts();
    const total = a.reservationsRequested + a.ordersNew + a.buffetOrdersNew;
    if (total > lastTotal.current) {
      audio.current?.play().catch(() => {});
    }
    lastTotal.current = total;
    setAlerts(a);
  }, []);

  React.useEffect(() => {
    let stop = false;
    const loop = async () => {
      try {
        await refresh();
      } catch {}
      if (!stop) setTimeout(loop, 15000);
    };
    loop();
    return () => {
      stop = true;
    };
  }, [refresh]);

  const markSeen = React.useCallback(
    async (kinds: AlertKind | AlertKind[]) => {
      const ks = Array.isArray(kinds) ? kinds : [kinds];
      try {
        await markAlertsSeen(ks);
        // optimistic local reset
        setAlerts((a) => ({
          reservationsRequested: ks.includes("reservations")
            ? 0
            : a.reservationsRequested,
          ordersNew: ks.includes("orders") ? 0 : a.ordersNew,
          buffetOrdersNew: ks.includes("buffet") ? 0 : a.buffetOrdersNew,
        }));
        lastTotal.current =
          (ks.includes("reservations") ? 0 : alerts.reservationsRequested) +
          (ks.includes("orders") ? 0 : alerts.ordersNew) +
          (ks.includes("buffet") ? 0 : alerts.buffetOrdersNew);
      } finally {
        // resync after a moment
        setTimeout(() => refresh().catch(() => {}), 2000);
      }
    },
    [alerts, refresh]
  );

  return (
    <AlertsContext.Provider value={{ alerts, refresh, markSeen }}>
      {children}
    </AlertsContext.Provider>
  );
}
