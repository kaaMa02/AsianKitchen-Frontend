// src/components/04_pages/Admin/RestaurantInfoAdminPage.tsx
import * as React from 'react';
import { Box, Paper, Typography, Button, TextField, Alert } from '@mui/material';
import type { RestaurantInfoReadDTO, RestaurantInfoWriteDTO, AddressDTO } from '../../../types/api-types';
import {
  listRestaurantInfo,      // returns RestaurantInfoReadDTO[]
  createRestaurantInfo,
  updateRestaurantInfo,
  deleteRestaurantInfo,
} from '../../../services/restaurantInfo';

const AK_DARK = '#0B2D24';
const AK_GOLD = '#D1A01F';
const card = { p: 3, borderRadius: 2, border: '1px solid #E2D9C2', bgcolor: '#f5efdf' } as const;

// ----- helpers -----
type RestaurantInfoForm = Omit<RestaurantInfoWriteDTO, 'address'> & {
  address: Partial<AddressDTO>; // allow blanks/undefined while editing
};

const toAddressDTO = (a?: Partial<AddressDTO> | null): AddressDTO => ({
  street: a?.street ?? '',
  streetNo: a?.streetNo ?? '',
  plz: a?.plz ?? '',
  city: a?.city ?? '',
});

const EMPTY_FORM: RestaurantInfoForm = {
  name: '',
  phone: '',
  email: '',
  instagramUrl: '',
  googleMapsUrl: '',
  aboutText: '',
  openingHours: '',
  address: {}, // partial on purpose
};

export default function RestaurantInfoAdminPage() {
  const [list, setList] = React.useState<RestaurantInfoReadDTO[]>([]);
  const [form, setForm] = React.useState<RestaurantInfoForm>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string>();

  const load = React.useCallback(async () => {
    const data = await listRestaurantInfo(); // your service returns an array
    setList(data);
    if (data.length) {
      const r = data[0];
      setEditingId(String(r.id));
      setForm({
        name: r.name ?? '',
        phone: r.phone ?? '',
        email: r.email ?? '',
        instagramUrl: r.instagramUrl ?? '',
        googleMapsUrl: r.googleMapsUrl ?? '',
        aboutText: r.aboutText ?? '',
        openingHours: r.openingHours ?? '',
        address: {
          street: r.address?.street,
          streetNo: r.address?.streetNo,
          plz: r.address?.plz,
          city: r.address?.city,
        },
      });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const save = async () => {
    setMsg(undefined);
    const payload: RestaurantInfoWriteDTO = {
      ...form,
      address: toAddressDTO(form.address), // <-- coerce to strict AddressDTO
    };
    if (editingId) {
      await updateRestaurantInfo(editingId, payload);
    } else {
      await createRestaurantInfo(payload);
    }
    await load();
    setMsg('Saved!');
  };

  const bind = (k: keyof RestaurantInfoForm) => ({
    value: (form as any)[k] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: e.target.value } as RestaurantInfoForm),
  });

  const addr = (k: keyof AddressDTO) => ({
    value: (form.address as any)[k] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, address: { ...form.address, [k]: e.target.value } }),
  });

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: AK_DARK }}>
        Restaurant Info
      </Typography>

      <Paper elevation={0} sx={card}>
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TextField label="Name" fullWidth {...bind('name')} />
          <TextField label="Phone" fullWidth {...bind('phone')} />
          <TextField label="Email" fullWidth {...bind('email')} />
          <TextField label="Instagram URL" fullWidth {...bind('instagramUrl')} />
          <TextField label="Google Maps URL" fullWidth {...bind('googleMapsUrl')} />

          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField label="About (short)" fullWidth multiline minRows={2} {...bind('aboutText')} />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField label="Opening hours (one per line)" fullWidth multiline minRows={4} {...bind('openingHours')} />
          </Box>

          <TextField label="Street" fullWidth {...addr('street')} sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }} />
          <TextField label="No." fullWidth {...addr('streetNo')} />
          <TextField label="PLZ" fullWidth {...addr('plz')} />
          <TextField label="City" fullWidth {...addr('city')} />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            onClick={save}
            variant="contained"
            sx={{ bgcolor: AK_GOLD, color: AK_DARK, fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}
          >
            Save
          </Button>
          {editingId && (
            <Button
              color="error"
              onClick={async () => {
                if (!window.confirm('Delete the current info record?')) return;
                await deleteRestaurantInfo(editingId);
                setEditingId(null);
                setForm(EMPTY_FORM);
                await load();
              }}
            >
              Delete
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
