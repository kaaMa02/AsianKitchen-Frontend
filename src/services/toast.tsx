import * as React from "react";
import { Snackbar, Alert } from "@mui/material";

type Severity = "success" | "error" | "info" | "warning";
type ToastIn = { text: string; severity?: Severity; durationMs?: number };
type Toast = ToastIn & { id: number; severity: Severity; durationMs: number };

let enqueueExternal: ((t: ToastIn) => void) | null = null;
const pending: ToastIn[] = [];

// ---- Deduper to suppress identical messages in a short window ----
const DEDUPE_WINDOW_MS = 5000;
let lastToastKey = "";
let lastToastAt = 0;

// Public helpers
export function notify(
  text: string,
  severity: Severity = "info",
  durationMs = 3000
) {
  const key = `${severity}:${text.trim()}`;
  const now = Date.now();
  if (key === lastToastKey && now - lastToastAt < DEDUPE_WINDOW_MS) return;
  lastToastKey = key;
  lastToastAt = now;

  if (enqueueExternal) enqueueExternal({ text, severity, durationMs });
  else pending.push({ text, severity, durationMs });
}
export function notifySuccess(text: string, durationMs = 2500) {
  notify(text, "success", durationMs);
}
export function notifyError(text: string, durationMs = 4000) {
  notify(text, "error", durationMs);
}
export function notifyInfo(text: string, durationMs = 3000) {
  notify(text, "info", durationMs);
}
export function notifyWarning(text: string, durationMs = 3000) {
  notify(text, "warning", durationMs);
}

// Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = React.useState<Toast[]>([]);
  const [current, setCurrent] = React.useState<Toast | null>(null);
  const [open, setOpen] = React.useState(false);

  // Install global enqueue and flush any pending toasts created before mount
  React.useEffect(() => {
    enqueueExternal = (t: ToastIn) =>
      setQueue((q) => [
        ...q,
        {
          id: Date.now() + Math.random(),
          text: t.text,
          severity: t.severity ?? "info",
          durationMs: t.durationMs ?? 3000,
        },
      ]);

    if (pending.length) {
      const p = pending.splice(0, pending.length);
      p.forEach((t) => enqueueExternal!(t));
    }
    return () => {
      enqueueExternal = null;
    };
  }, []);

  // Show next toast when ready
  React.useEffect(() => {
    if (!current && queue.length) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
      setOpen(true);
    }
  }, [queue, current]);

  const handleClose = (_?: unknown, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
    setCurrent(null);
  };

  return (
    <>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={current?.durationMs ?? 3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity ?? "info"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {current?.text}
        </Alert>
      </Snackbar>
    </>
  );
}
