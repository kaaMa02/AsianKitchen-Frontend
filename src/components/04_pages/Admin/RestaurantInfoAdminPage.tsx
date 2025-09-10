import * as React from "react";
import { Paper, Typography, TextField, Button, Box } from "@mui/material";
import {
  listRestaurantInfo,
  updateRestaurantInfo,
} from "../../../services/restaurantInfo";
import { notifyError, notifySuccess } from "../../../services/toast";
import {
  RestaurantInfoWriteDTO,
  RestaurantInfoReadDTO,
} from "../../../types/api-types";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

export default function RestaurantInfoAdminPage() {
  const [id, setId] = React.useState<string | undefined>(undefined);
  const [form, setForm] = React.useState<RestaurantInfoWriteDTO>({
    name: "",
    phone: "",
    address: { street: "", streetNo: "", plz: "", city: "" },
    openingHours: "",
    deliveryNote: "",
  });

  const load = async () => {
    try {
      const all = await listRestaurantInfo();
      if (all.length > 0) {
        const row = all[0] as unknown as RestaurantInfoReadDTO;
        setId(String(row.id));
        setForm({
          name: row.name || "",
          phone: row.phone || "",
          address: {
            street: row.address?.street || "",
            streetNo: row.address?.streetNo || "",
            plz: row.address?.plz || "",
            city: row.address?.city || "",
          },
          openingHours: row.openingHours || "",
          deliveryNote: (row as any).deliveryNote || "",
        });
      }
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load info");
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!id) return;
    try {
      const { deliveryNote, ...payload } = form;
      await updateRestaurantInfo(id, payload as RestaurantInfoWriteDTO);
      notifySuccess("Saved");
      await load();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Save failed");
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}
    >
      <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
        Restaurant Info
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <TextField
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <TextField
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />

        <TextField
          label="Street"
          value={form.address.street}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              address: { ...f.address, street: e.target.value },
            }))
          }
        />
        <TextField
          label="No."
          value={form.address.streetNo}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              address: { ...f.address, streetNo: e.target.value },
            }))
          }
        />
        <TextField
          label="PLZ"
          value={form.address.plz}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              address: { ...f.address, plz: e.target.value },
            }))
          }
        />
        <TextField
          label="City"
          value={form.address.city}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              address: { ...f.address, city: e.target.value },
            }))
          }
        />

        <TextField
          label="Opening hours (multiline)"
          value={form.openingHours}
          onChange={(e) =>
            setForm((f) => ({ ...f, openingHours: e.target.value }))
          }
          multiline
          minRows={4}
          sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
        />
        <TextField
          label="Delivery note (optional)"
          value={form.deliveryNote || ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, deliveryNote: e.target.value }))
          }
          multiline
          minRows={2}
          sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button
          onClick={save}
          variant="contained"
          disabled={!id}
          sx={{
            bgcolor: AK_GOLD,
            color: AK_DARK,
            fontWeight: 800,
            "&:hover": { bgcolor: "#E2B437" },
          }}
        >
          Save
        </Button>
      </Box>
    </Paper>
  );
}
