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

  // audio handling
  const lastTotal = React.useRef(0);
  const audio = React.useRef<HTMLAudioElement | null>(null);
  const primed = React.useRef(false);

  // create audio element
  React.useEffect(() => {
    audio.current = new Audio("/notify.mp3");
    audio.current.preload = "auto";
  }, []);

  // prime on first user interaction (required by browsers)
  React.useEffect(() => {
    const prime = () => {
      if (primed.current || !audio.current) return;
      // Try to play once, then immediately pause to “unlock” audio
      audio.current
        .play()
        .then(() => {
          audio.current?.pause();
          if (audio.current) audio.current.currentTime = 0;
          primed.current = true;
        })
        .catch(() => {
          // If blocked, we'll try again on next interaction
        });
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  const refresh = React.useCallback(async () => {
    const a = await getAdminAlerts();
    const total = a.reservationsRequested + a.ordersNew + a.buffetOrdersNew;
    if (total > lastTotal.current && primed.current) {
      audio.current?.play().catch(() => {});
    }
    lastTotal.current = total;
    setAlerts(a);
  }, []);

  // poll
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
        // optimistic zeroing
        setAlerts((a) => ({
          reservationsRequested: ks.includes("reservations")
            ? 0
            : a.reservationsRequested,
          ordersNew: ks.includes("orders") ? 0 : a.ordersNew,
          buffetOrdersNew: ks.includes("buffet") ? 0 : a.buffetOrdersNew,
        }));
        // recalc lastTotal based on optimistic state
        lastTotal.current =
          (ks.includes("reservations") ? 0 : alerts.reservationsRequested) +
          (ks.includes("orders") ? 0 : alerts.ordersNew) +
          (ks.includes("buffet") ? 0 : alerts.buffetOrdersNew);
      } finally {
        setTimeout(() => refresh().catch(() => {}), 1200);
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
