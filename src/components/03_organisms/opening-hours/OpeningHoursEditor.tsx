import * as React from "react";
import {
  Box, Paper, Typography, TextField, IconButton, Button, Tooltip, Divider
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

// ─────────────────────────── Types & constants ───────────────────────────
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

function emptyHours(): Hours {
  return { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
}

// ─────────────────────────── Parse / Serialize ───────────────────────────
/** Parses either your old multiline text or the JSON you pasted earlier. */
export function parseAnyOpeningHours(src?: string | null): Hours {
  if (!src) return emptyHours();
  const trimmed = src.trim();

  // JSON like: {"1":[{"open":"11:00","close":"14:00"}], ...}
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as Record<string, { open: string; close: string }[]>;
      const map: Record<string, keyof Hours> = {
        "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun",
      };
      const out = emptyHours();
      Object.keys(map).forEach((n) => {
        out[map[n]] = (j[n] ?? []).map(r => ({
          open: (r.open || "").slice(0, 5),
          close: (r.close || "").slice(0, 5),
        }));
      });
      return out;
    } catch {
      // fall through to multiline parsing
    }
  }

  // Multiline example:  Mon: 11:00-14:00, 17:00-23:00
  const out = emptyHours();
  trimmed.split(/\r?\n/).forEach(line => {
    const [d, times] = line.split(":");
    const day = (d ?? "").trim().slice(0, 3);
    const key = DAYS.find(x => x.label === day)?.key;
    if (!key || !times) return;
    const ranges = times.split(",").map(s => s.trim()).filter(Boolean);
    out[key] = ranges.map(r => {
      const [o, c] = r.split("-").map(x => (x || "").trim());
      return { open: (o || "").slice(0, 5), close: (c || "").slice(0, 5) };
    }).filter(r => r.open && r.close);
  });
  return out;
}

/** Serializes to the same multiline string your backend already stores. */
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

// ─────────────────────────── Component ───────────────────────────
export default function OpeningHoursEditor({
  value, onChange,
}: { value?: string | null; onChange: (multiline: string) => void }) {
  const [hours, setHours] = React.useState<Hours>(() => parseAnyOpeningHours(value));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { setHours(parseAnyOpeningHours(value)); }, [value]);

  const commit = (next: Hours) => {
    const err = validate(next);
    setError(err);
    onChange(serializeToMultiline(next));
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
      const arr = [...prev[day]];
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
