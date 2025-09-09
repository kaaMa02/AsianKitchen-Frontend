import * as React from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Menu, MenuItem, Chip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ReservationReadDTO, ReservationStatus } from '../../../types/api-types';
import { listReservations, setReservationStatus, deleteReservation } from '../../../services/reservations';

const card = { p: 3, borderRadius: 2, border: '1px solid #E2D9C2', bgcolor: '#f5efdf' } as const;

function StatusChip({ s }:{s:ReservationStatus}) {
  const map: Record<ReservationStatus,string> = {
    REQUESTED: 'default', CONFIRMED: 'success', REJECTED: 'error', NO_SHOW: 'warning', CANCELLED: 'warning'
  } as any;
  return <Chip size="small" label={s} color={map[s] as any} />;
}

export default function ReservationsAdminPage() {
  const [rows, setRows] = React.useState<ReservationReadDTO[]>([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuId, setMenuId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => setRows(await listReservations()), []);
  React.useEffect(() => { load(); }, [load]);

  const openMenu = (e: React.MouseEvent<HTMLElement>, id: string) => { setAnchorEl(e.currentTarget); setMenuId(id); };
  const closeMenu = () => { setAnchorEl(null); setMenuId(null); };

  const change = async (s: ReservationStatus) => {
    if (!menuId) return;
    await setReservationStatus(menuId, s);
    closeMenu(); await load();
  };
  const remove = async () => {
    if (!menuId) return;
    if (!window.confirm('Delete this reservation?')) return;
    await deleteReservation(menuId);
    closeMenu(); await load();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: '#0B2D24' }}>Reservations</Typography>
      <Paper elevation={0} sx={card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>People</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={String(r.id)}>
                <TableCell>{r.reservationDateTime}</TableCell>
                <TableCell>{r.customerInfo.firstName} {r.customerInfo.lastName}</TableCell>
                <TableCell>{r.customerInfo.email}</TableCell>
                <TableCell>{r.customerInfo.phone}</TableCell>
                <TableCell>{r.numberOfPeople}</TableCell>
                <TableCell><StatusChip s={r.status} /></TableCell>
                <TableCell align="right">
                  <IconButton onClick={(e) => openMenu(e, String(r.id))}><MoreVertIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Menu open={!!anchorEl} anchorEl={anchorEl} onClose={closeMenu}>
          <MenuItem onClick={() => change(ReservationStatus.CONFIRMED)}>Confirm</MenuItem>
          <MenuItem onClick={() => change(ReservationStatus.REJECTED)}>Reject</MenuItem>
          <MenuItem onClick={() => change(ReservationStatus.CANCELLED)}>Cancel</MenuItem>
          <MenuItem onClick={remove}>Delete</MenuItem>
        </Menu>
      </Paper>
    </Box>
  );
}
