export type TimeRange = { open: string; close: string };       // "HH:mm"
export type OpeningHours = { [day: string]: TimeRange[] };      // "1".."7"

export const DAY_LABELS: Record<string, string> = {
  "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun",
};

const EMPTY: OpeningHours = { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [] };

function splitOnce(s: string, delim: string): [string, string] {
  const i = s.indexOf(delim);
  if (i === -1) return [s, ""];
  return [s.slice(0, i), s.slice(i + delim.length)];
}

export function parseOpeningHours(jsonOrMultiline?: string | null): OpeningHours {
  if (!jsonOrMultiline) return { ...EMPTY };
  const trimmed = jsonOrMultiline.trim();

  // JSON (preferred)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const raw = JSON.parse(trimmed) as OpeningHours;
      const norm: OpeningHours = { ...EMPTY };
      for (const d of Object.keys(norm)) {
        norm[d] = (raw?.[d] ?? []).map(r => ({
          open: String(r.open || "").slice(0, 5),
          close: String(r.close || "").slice(0, 5),
        })).filter(r => r.open && r.close);
      }
      return norm;
    } catch {
      // fall through
    }
  }

  // Legacy multiline fallback (Mon: 11:00-14:00, 17:00-22:00)
  const nameToNum: Record<string, string> = {
    mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6", sun: "7",
    monday: "1", tuesday: "2", wednesday: "3", thursday: "4", friday: "5", saturday: "6", sunday: "7",
  };
  const out: OpeningHours = { ...EMPTY };
  trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    const [left, rightRaw] = splitOnce(line, ":");
    const key = nameToNum[left?.toLowerCase()?.replace(/\.$/, "") || ""];
    if (!key) return;

    const right = (rightRaw || "").trim();
    if (!right || right.toLowerCase().startsWith("(closed)")) {
      out[key] = [];
      return;
    }

    const ranges = right.split(",").map(s => s.trim()).filter(Boolean);
    out[key] = ranges.map(r => {
      const [o, c] = splitOnce(r.replace(/–/g, "-"), "-");
      return { open: (o || "").trim().slice(0,5), close: (c || "").trim().slice(0,5) };
    }).filter(r => r.open && r.close);
  });
  return out;
}

export function serializeOpeningHours(h: OpeningHours): string {
  return JSON.stringify(h);
}

export function formatDayLine(ranges: TimeRange[]): string {
  if (!ranges?.length) return "Closed";
  return ranges.map(r => `${r.open}–${r.close}`).join(", ");
}

export function validateHours(h: OpeningHours): string | null {
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const d of Object.keys(h)) {
    for (const r of h[d]) {
      if (!hhmm.test(r.open) || !hhmm.test(r.close)) return "Times must be HH:mm (e.g., 11:00).";
      if (r.open >= r.close) return "Opening time must be before the closing time.";
    }
  }
  return null;
}
