import * as React from "react";
import {
  AdminAlerts,
  getAdminAlerts,
  markAlertsSeen,
  AlertKind,
} from "../services/alerts";

/** ===== Audio hook that is robust against autoplay and “missed” first ring ===== */
type BellOptions = {
  src?: string;
  intervalMs?: number; // re-ring cadence
  volume?: number;
};

function useBell(opts: BellOptions = {}) {
  const {
    src = "/incoming.mp3", // <- unify with public file
    intervalMs = 60_000,
    volume = 1,
  } = opts;

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [armed, setArmed] = React.useState<boolean>(() => {
    return localStorage.getItem("orderSoundEnabled") === "1";
  });
  const [isRinging, setIsRinging] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const pendingRingRef = React.useRef(false);

  React.useEffect(() => {
    const a = new Audio(src);
    a.preload = "auto";
    a.loop = false;
    a.volume = volume;
    audioRef.current = a;
  }, [src, volume]);

  React.useEffect(() => {
    if (armed) return;
    const unlock = async () => {
      try {
        const a = audioRef.current;
        if (!a) return;
        a.muted = true;
        await a.play();
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        setArmed(true);
        localStorage.setItem("orderSoundEnabled", "1");
        if (pendingRingRef.current) startRinging();
      } catch {
      } finally {
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
  }, [armed]);

  const ringOnce = React.useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
      await a.play();
    } catch {}
  }, []);

  const startRinging = React.useCallback(() => {
    if (!armed) {
      pendingRingRef.current = true;
      return;
    }
    pendingRingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRinging(true);
    void ringOnce();
    timerRef.current = window.setInterval(() => void ringOnce(), intervalMs);
  }, [armed, intervalMs, ringOnce]);

  const stopRinging = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRinging(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { armed, isRinging, startRinging, stopRinging };
}

/** ===== Context ===== */
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

  const { startRinging, stopRinging } = useBell({
    src: "/incoming.mp3",
    intervalMs: 60_000,
    volume: 1,
  });

  const refresh = React.useCallback(async () => {
    const a = await getAdminAlerts();
    const p = prevRef.current;
    const inc =
      a.reservationsRequested > p.reservationsRequested ||
      a.ordersNew > p.ordersNew ||
      a.buffetOrdersNew > p.buffetOrdersNew;

    if (inc) startRinging();

    const sum = a.reservationsRequested + a.ordersNew + a.buffetOrdersNew;
    if (sum === 0) stopRinging();

    prevRef.current = a;
    setAlerts(a);
  }, [startRinging, stopRinging]);

  React.useEffect(() => {
    let stop = false;
    const loop = async () => {
      try {
        await refresh();
      } catch {}
      if (!stop) window.setTimeout(loop, 15_000);
    };
    void loop();
    return () => {
      stop = true;
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
      prevRef.current = {
        reservationsRequested: ks.includes("reservations")
          ? 0
          : prevRef.current.reservationsRequested,
        ordersNew: ks.includes("orders") ? 0 : prevRef.current.ordersNew,
        buffetOrdersNew: ks.includes("buffet")
          ? 0
          : prevRef.current.buffetOrdersNew,
      };

      const nxt =
        (ks.includes("reservations")
          ? 0
          : prevRef.current.reservationsRequested) +
        (ks.includes("orders") ? 0 : prevRef.current.ordersNew) +
        (ks.includes("buffet") ? 0 : prevRef.current.buffetOrdersNew);

      if (nxt === 0) stopRinging();

      window.setTimeout(() => {
        void refresh();
      }, 800);
    },
    [refresh, stopRinging]
  );

  const total =
    alerts.reservationsRequested + alerts.ordersNew + alerts.buffetOrdersNew;

  return (
    <CtxObj.Provider value={{ alerts, total, refresh, markSeen }}>
      {children}
    </CtxObj.Provider>
  );
}
