import * as React from "react";
import {
  Box, Paper, Typography, TextField, IconButton, Button, Tooltip, Divider
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

/* ─────────────────────────── Types & constants ─────────────────────────── */
type Range = { open: string; close: string };
export type Hours = Record<string, Range[]>; // "Mon".."Sun"

const DAYS: Array<{ key: keyof Hours; label: string }> = [
  { key: "Mon", label: "Mon" },
  { key: "Tue", label: "Tue" },
  { key: "Wed", label: "Wed" },
  { key: "Thu", label: "Thu" },
  { key: "Fri", label: "Fri" },
  { key: "Sat", label: "Sat" },
  { key: "Sun", label: "Sun" },
];

const DAY_TO_NUM: Record<string, string> = {
  Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6", Sun: "7",
};

function emptyHours(): Hours {
  return { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function splitOnce(s: string, delim: string): [string, string] {
  const i = s.indexOf(delim);
  if (i === -1) return [s, ""];
  return [s.slice(0, i), s.slice(i + delim.length)];
}

/** Parses either JSON (numbers 1..7) or legacy multiline like `Mon: 11:00-14:00, 17:00-22:00`. */
export function parseAnyOpeningHours(src?: string | null): Hours {
  if (!src) return emptyHours();
  const trimmed = src.trim();

  // JSON -> {"1":[{"open":"11:00","close":"14:00"}], ...}
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as Record<string, { open: string; close: string }[]>;
      const out = emptyHours();
      (Object.keys(DAY_TO_NUM) as Array<keyof Hours>).forEach((dayKey) => {
        const num = DAY_TO_NUM[dayKey];
        const arr = j[num] ?? [];
        out[dayKey] = arr.map(r => ({
          open: String(r.open || "").slice(0, 5),
          close: String(r.close || "").slice(0, 5),
        })).filter(r => r.open && r.close);
      });
      return out;
    } catch {
      // fall through to multiline parsing
    }
  }

  // Legacy multiline: "Mon: 11:00-14:00, 17:00-23:00"
  const out = emptyHours();
  trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    const [left, rightRaw] = splitOnce(line, ":");
    const day = left.trim().slice(0, 3);
    const key = (DAYS.find(x => x.label === day)?.key) as keyof Hours | undefined;
    if (!key) return;

    const right = (rightRaw || "").trim();
    if (!right || right.toLowerCase().startsWith("(closed)")) {
      out[key] = [];
      return;
    }

    const ranges = right.split(",").map(s => s.trim()).filter(Boolean);
    out[key] = ranges.map(r => {
      const norm = r.replace(/–/g, "-"); // en dash → hyphen
      const [o, c] = splitOnce(norm, "-");
      return { open: (o || "").trim().slice(0, 5), close: (c || "").trim().slice(0, 5) };
    }).filter(r => r.open && r.close);
  });

  return out;
}

/** Serializes to your existing multiline format the backend already stores. */
export function serializeToMultiline(h: Hours): string {
  return DAYS.map(({ key, label }) => {
    if (!h[key]?.length) return `${label}: (closed)`;
    const ranges = h[key].map(r => `${r.open}-${r.close}`).join(", ");
    return `${label}: ${ranges}`;
  }).join("\n");
}

function validate(h: Hours): string | null {
  const re = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm
  for (const { key } of DAYS) {
    for (const r of h[key]) {
      if (!re.test(r.open) || !re.test(r.close)) return "Times must be HH:mm (e.g. 11:00).";
      if (r.open >= r.close) return "An opening time must be before the closing time.";
    }
  }
  return null;
}

/* ─────────────────────────── Component ─────────────────────────── */
export default function OpeningHoursEditor({
  value, onChange,
}: { value?: string | null; onChange: (multiline: string) => void }) {
  const [hours, setHours] = React.useState<Hours>(() => parseAnyOpeningHours(value));
  const [error, setError] = React.useState<string | null>(null);

  // Only re-hydrate local state when the incoming value actually changed (prevents “jumping”)
  const prevValueRef = React.useRef<string | null | undefined>(undefined);
  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setHours(parseAnyOpeningHours(value));
    }
  }, [value]);

  const commit = (next: Hours) => {
    const err = validate(next);
    setError(err);
    onChange(serializeToMultiline(next)); // keep storing multiline string
  };

  const setRange = (day: keyof Hours, idx: number, patch: Partial<Range>) => {
    setHours(prev => {
      const arr = prev[day].map((r, i) => (i === idx ? { ...r, ...patch } : r));
      const next = { ...prev, [day]: arr };
      commit(next);
      return next;
    });
  };

  const addRange = (day: keyof Hours) => {
    setHours(prev => {
      const next = { ...prev, [day]: [...prev[day], { open: "11:00", close: "14:00" }] };
      commit(next);
      return next;
    });
  };

  const removeRange = (day: keyof Hours, idx: number) => {
    setHours(prev => {
      const arr = prev[day].slice();
      arr.splice(idx, 1);
      const next = { ...prev, [day]: arr };
      commit(next);
      return next;
    });
  };

  const setClosed = (day: keyof Hours) => {
    setHours(prev => {
      const next = { ...prev, [day]: [] };
      commit(next);
      return next;
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: "#FBF8ED", borderColor: "rgba(11,45,36,.12)" }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>Opening hours</Typography>

      <Box sx={{ display: "grid", rowGap: 1.25 }}>
        {DAYS.map(({ key, label }) => (
          <Box key={key} sx={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "start", gap: 1 }}>
            <Typography sx={{ fontWeight: 700, lineHeight: "40px" }}>{label}</Typography>

            <Box sx={{ display: "grid", gap: 0.75 }}>
              {hours[key].length === 0 && (
                <Typography sx={{ opacity: 0.6 }}>(closed)</Typography>
              )}

              {hours[key].map((r, i) => (
                <Box key={i} sx={{ display: "grid", gridTemplateColumns: "140px 140px auto", gap: 1, alignItems: "center" }}>
                  <TextField
                    size="small"
                    label="Open"
                    type="time"
                    inputProps={{ step: 300 }}
                    value={r.open}
                    onChange={(e) => setRange(key, i, { open: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Close"
                    type="time"
                    inputProps={{ step: 300 }}
                    value={r.close}
                    onChange={(e) => setRange(key, i, { close: e.target.value })}
                  />
                  <Tooltip title="Remove range">
                    <IconButton onClick={() => removeRange(key, i)} size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}

              <Box>
                <Button size="small" onClick={() => addRange(key)} startIcon={<AddIcon />}>Add range</Button>
                <Button size="small" color="inherit" sx={{ ml: 1 }} onClick={() => setClosed(key)}>Set closed</Button>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {error && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography color="error">{error}</Typography>
        </>
      )}
    </Paper>
  );
}
