export function parseUtc(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const hasZone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(iso);
  const normalized = hasZone ? iso : `${iso}Z`;
  const dt = new Date(normalized);
  return isNaN(dt.getTime()) ? null : dt;
}

const fmtZurich = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

export function formatZurich(iso: string | null | undefined): string {
  const d = parseUtc(iso);
  return d ? fmtZurich.format(d) : "-";
}
