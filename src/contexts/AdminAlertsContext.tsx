import * as React from "react";
import {
  AdminAlerts,
  getAdminAlerts,
  markAlertsSeen,
  AlertKind,
} from "../services/alerts";

function useBell() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    audioRef.current = new Audio("/notify.mp3");
    audioRef.current.preload = "auto";
  }, []);

  React.useEffect(() => {
    const unlock = () => {
      void audioRef.current?.play().catch(() => {});
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setArmed(true);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = React.useCallback(() => {
    if (!audioRef.current) return;
    const a = audioRef.current.cloneNode(true) as HTMLAudioElement;
    void a.play().catch(() => {});
  }, []);

  return { play, armed };
}

type Ctx = {
  alerts: AdminAlerts;
  total: number;
  refresh: () => Promise<void>;
  markSeen: (kinds: AlertKind | AlertKind[]) => Promise<void>;
};

const CtxObj = React.createContext<Ctx | null>(null);
export function useAdminAlerts() {
  const ctx = React.useContext(CtxObj);
  if (!ctx)
    throw new Error("useAdminAlerts must be used within <AdminAlertsProvider>");
  return ctx;
}

const ZERO: AdminAlerts = {
  reservationsRequested: 0,
  ordersNew: 0,
  buffetOrdersNew: 0,
};
type ProviderProps = Readonly<{ children: React.ReactNode }>;

export function AdminAlertsProvider({ children }: ProviderProps) {
  const [alerts, setAlerts] = React.useState<AdminAlerts>(ZERO);
  const prevRef = React.useRef<AdminAlerts>(ZERO);
  const { play, armed } = useBell();

  const refresh = React.useCallback(async () => {
    const a = await getAdminAlerts(); // returns *unseen* counts from backend
    // ring if any bucket increased vs previous snapshot
    const p = prevRef.current;
    const inc =
      a.reservationsRequested > p.reservationsRequested ||
      a.ordersNew > p.ordersNew ||
      a.buffetOrdersNew > p.buffetOrdersNew;

    if (inc && armed) play();
    prevRef.current = a;
    setAlerts(a);
  }, [armed, play]);

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
      await markAlertsSeen(ks); // server zeroes unseen for those buckets

      // optimistic local zero for those buckets
      setAlerts((a) => ({
        reservationsRequested: ks.includes("reservations")
          ? 0
          : a.reservationsRequested,
        ordersNew: ks.includes("orders") ? 0 : a.ordersNew,
        buffetOrdersNew: ks.includes("buffet") ? 0 : a.buffetOrdersNew,
      }));
      prevRef.current = {
        reservationsRequested: ks.includes("reservations")
          ? 0
          : prevRef.current.reservationsRequested,
        ordersNew: ks.includes("orders") ? 0 : prevRef.current.ordersNew,
        buffetOrdersNew: ks.includes("buffet")
          ? 0
          : prevRef.current.buffetOrdersNew,
      };

      // pull once more to align with server
      setTimeout(() => {
        void refresh();
      }, 800);
    },
    [refresh]
  );

  const total =
    alerts.reservationsRequested + alerts.ordersNew + alerts.buffetOrdersNew;

  return (
    <CtxObj.Provider value={{ alerts, total, refresh, markSeen }}>
      {children}
    </CtxObj.Provider>
  );
}
