import { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, Switch, TextField, Button, Divider,
  Alert, Chip, Stack
} from "@mui/material";
import { getDiscountConfig, updateDiscountConfig } from "../../../services/discounts";

type Form = {
  enabled: boolean;
  percentMenu: string;     // keep in inputs as strings, validate on save
  percentBuffet: string;
  startsAt: string;        // HTML datetime-local string
  endsAt: string;
};

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  // Convert ISO->local datetime-local (YYYY-MM-DDTHH:mm)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  // local (no tz) -> ISO with offset of current browser
  const d = new Date(local);
  return d.toISOString();
}

export default function DiscountsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [form, setForm] = useState<Form>({
    enabled: false,
    percentMenu: "0",
    percentBuffet: "0",
    startsAt: "",
    endsAt: "",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const cfg = await getDiscountConfig();
        setForm({
          enabled: !!cfg.enabled,
          percentMenu: String(cfg.percentMenu ?? 0),
          percentBuffet: String(cfg.percentBuffet ?? 0),
          startsAt: toDatetimeLocal(cfg.startsAt ?? null),
          endsAt: toDatetimeLocal(cfg.endsAt ?? null),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const livePreview = useMemo(() => {
    const menu = Number(form.percentMenu) || 0;
    const buffet = Number(form.percentBuffet) || 0;
    if (!form.enabled || (menu <= 0 && buffet <= 0)) return null;
    const parts = [];
    if (menu > 0) parts.push(`${menu}% off Menu`);
    if (buffet > 0) parts.push(`${buffet}% off Buffet`);
    return parts.join(" • ");
  }, [form]);

  const onSave = async () => {
    setError(undefined);
    setOk(undefined);
    // validate 0..100
    const pm = Number(form.percentMenu);
    const pb = Number(form.percentBuffet);
    if (Number.isNaN(pm) || pm < 0 || pm > 100) {
      setError("Menu percent must be between 0 and 100.");
      return;
    }
    if (Number.isNaN(pb) || pb < 0 || pb > 100) {
      setError("Buffet percent must be between 0 and 100.");
      return;
    }
    const startsIso = toIsoOrNull(form.startsAt);
    const endsIso = toIsoOrNull(form.endsAt);
    if (startsIso && endsIso && new Date(startsIso) > new Date(endsIso)) {
      setError("Start time must be before end time.");
      return;
    }

    setSaving(true);
    try {
      await updateDiscountConfig({
        enabled: form.enabled,
        percentMenu: pm,
        percentBuffet: pb,
        startsAt: startsIso,
        endsAt: endsIso,
      });
      setOk("Saved! Customers will see this immediately.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        Discounts / Sale
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 2 }} elevation={0}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Switch
            checked={form.enabled}
            onChange={(_, v) => setForm((f) => ({ ...f, enabled: v }))}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {form.enabled ? "Sale is ENABLED" : "Sale is DISABLED"}
          </Typography>
          {livePreview && form.enabled && <Chip color="success" label={livePreview} />}
        </Stack>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField
            type="number"
            label="Menu discount (%)"
            value={form.percentMenu}
            onChange={(e) => setForm((f) => ({ ...f, percentMenu: e.target.value }))}
            inputProps={{ min: 0, max: 100, step: "0.1" }}
          />
          <TextField
            type="number"
            label="Buffet discount (%)"
            value={form.percentBuffet}
            onChange={(e) => setForm((f) => ({ ...f, percentBuffet: e.target.value }))}
            inputProps={{ min: 0, max: 100, step: "0.1" }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.8 }}>
          Optional schedule (leave empty for always-on)
        </Typography>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField
            label="Starts at"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Ends at"
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <Box sx={{ mt: 3, display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={loading || saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              // quick off switch
              setForm((f) => ({ ...f, enabled: false }));
            }}
          >
            Disable sale
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
