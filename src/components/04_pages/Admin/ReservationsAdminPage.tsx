import * as React from 'react';
import {
  Box, Paper, Typography, Button, Chip, Divider, Alert,
} from '@mui/material';
import {
  listPendingReservations,
  updateReservationStatus,
} from '../../../services/reservations';
import type { ReservationReadDTO, ReservationStatus } from '../../../types/api-types';

const AK_DARK = '#0B2D24';

export default function ReservationsAdminPage() {
  const [rows, setRows] = React.useState<ReservationReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();

  const load = React.useCallback(async () => {
    try {
      setError(undefined);
      setLoading(true);
      const data = await listPendingReservations();
      setRows(data);
    } catch (e) {
      setError('Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: ReservationStatus) => {
    try {
      await updateReservationStatus(id, status);
      await load();
    } catch {
      setError('Failed to update status.');
    }
  };

  return (
    <Box sx={{ bgcolor: '#F6F0DE', minHeight: '100vh', py: { xs: 4, md: 6 } }}>
      <Box sx={{ maxWidth: 1000, mx: 'auto', px: 2 }}>
        <Typography variant="h4" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
          Reservations (Pending)
        </Typography>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(11,45,36,0.12)' }}>
          {loading ? (
            <Typography sx={{ color: AK_DARK, opacity: 0.8 }}>Loading…</Typography>
          ) : rows.length === 0 ? (
            <Typography sx={{ color: AK_DARK, opacity: 0.8 }}>No pending reservations.</Typography>
          ) : (
            rows.map(r => (
              <Box key={r.id} sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 800, color: AK_DARK }}>
                    {r.customerInfo.firstName} {r.customerInfo.lastName}
                  </Typography>
                  <Typography sx={{ color: AK_DARK }}>{r.customerInfo.phone}</Typography>
                  <Typography sx={{ color: AK_DARK, opacity: 0.8 }}>{r.customerInfo.email}</Typography>
                  <Chip size="small" label={r.status} />
                </Box>
                <Typography sx={{ color: AK_DARK, mt: 0.5 }}>
                  {new Date(r.reservationDateTime).toLocaleString()} — {r.numberOfPeople} people
                </Typography>
                {r.specialRequests && (
                  <Typography sx={{ color: AK_DARK, opacity: 0.85, mt: 0.5 }}>
                    Notes: {r.specialRequests}
                  </Typography>
                )}

                <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                  <Button variant="contained" onClick={() => setStatus(r.id, 'CONFIRMED' as ReservationStatus)}>
                    Confirm
                  </Button>
                  <Button color="warning" variant="outlined" onClick={() => setStatus(r.id, 'REJECTED' as ReservationStatus)}>
                    Reject
                  </Button>
                  <Button color="error" variant="text" onClick={() => setStatus(r.id, 'CANCELLED' as ReservationStatus)}>
                    Cancel
                  </Button>
                </Box>

                <Divider sx={{ mt: 1.5 }} />
              </Box>
            ))
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Paper>
      </Box>
    </Box>
  );
}
