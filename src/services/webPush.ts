import axios from "./http";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function keyToB64Url(key: ArrayBuffer | null): string {
  if (!key) return "";
  const bytes = new Uint8Array(key);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Call once in admin shell after login. */
export async function setupAdminWebPush() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  // 1) register SW from site root
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

  // 2) ask permission
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return;

  // 3) get VAPID key
  const { data } = await axios.get<{ publicKey: string }>("/api/public/webpush/vapid-key", {
    withCredentials: false,
  });

  // 4) subscribe
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(data.publicKey),
  });

  // 5) send to backend
  const payload = {
    endpoint: sub.endpoint,
    tag: "admin",
    keys: {
      p256dh: keyToB64Url(sub.getKey("p256dh")),
      auth: keyToB64Url(sub.getKey("auth")),
    },
  };
  await axios.post("/api/public/webpush/subscribe", payload, { withCredentials: false });

  // Optional: react to clicks from the SW
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "AK_PUSH_CLICK" && e.data.url) {
      if (window.location.pathname !== e.data.url) window.location.assign(e.data.url);
    }
  });
}
