import * as React from "react";
import {
  AdminAlerts,
  getAdminAlerts,
  markAlertsSeen,
  AlertKind,
} from "../services/alerts";

/** Arm audio after first user gesture (required by browsers). */
function useBell() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [unlocked, setUnlocked] = React.useState(false);

  React.useEffect(() => {
    audioRef.current = new Audio("/notify.mp3");
    audioRef.current.preload = "auto";
  }, []);

  React.useEffect(() => {
    const unlock = () => {
      if (!unlocked) {
        void audioRef.current?.play().catch(() => {});
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        setUnlocked(true);
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [unlocked]);

  const play = React.useCallback(() => {
    if (!audioRef.current) return;
    const a = audioRef.current.cloneNode(true) as HTMLAudioElement;
    void a.play().catch(() => {});
  }, []);

  return { play, unlocked };
}

type Ctx = {
  alerts: AdminAlerts;
  total: number;
  refresh: () => Promise<void>;
  markSeen: (kinds: AlertKind | AlertKind[]) => Promise<void>;
};

const AdminAlertsContext = React.createContext<Ctx | null>(null);

export function useAdminAlerts() {
  const ctx = React.useContext(AdminAlertsContext);
  if (!ctx)
    throw new Error("useAdminAlerts must be used within <AdminAlertsProvider>");
  return ctx;
}

const EMPTY: AdminAlerts = {
  reservationsRequested: 0,
  ordersNew: 0,
  buffetOrdersNew: 0,
};

type ProviderProps = Readonly<{ children: React.ReactNode }>;

export function AdminAlertsProvider({ children }: ProviderProps) {
  const [alerts, setAlerts] = React.useState<AdminAlerts>(EMPTY);
  const lastTotalRef = React.useRef(0);
  const { play } = useBell();

  const refresh = React.useCallback(async () => {
    const a = await getAdminAlerts();
    const total = a.reservationsRequested + a.ordersNew + a.buffetOrdersNew;
    if (total > lastTotalRef.current) play();
    lastTotalRef.current = total;
    setAlerts(a);
  }, [play]);

  React.useEffect(() => {
    let stopped = false;
    const loop = async () => {
      try {
        await refresh();
      } catch {
        /* ignore */
      }
      if (!stopped) setTimeout(loop, 15000);
    };
    loop();
    return () => {
      stopped = true;
    };
  }, [refresh]);

  const markSeen = React.useCallback(
    async (kinds: AlertKind | AlertKind[]) => {
      const ks = Array.isArray(kinds) ? kinds : [kinds];
      await markAlertsSeen(ks);
      setAlerts((a) => ({
        reservationsRequested: ks.includes("reservations")
          ? 0
          : a.reservationsRequested,
        ordersNew: ks.includes("orders") ? 0 : a.ordersNew,
        buffetOrdersNew: ks.includes("buffet") ? 0 : a.buffetOrdersNew,
      }));
      lastTotalRef.current = 0;
      setTimeout(() => {
        void refresh();
      }, 1500);
    },
    [refresh]
  );

  const total =
    alerts.reservationsRequested + alerts.ordersNew + alerts.buffetOrdersNew;

  return (
    <AdminAlertsContext.Provider value={{ alerts, total, refresh, markSeen }}>
      {children}
    </AdminAlertsContext.Provider>
  );
}
