import * as React from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Select, MenuItem, Tooltip,
  CircularProgress, Alert, Stack, Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { listAllBuffetOrders, updateBuffetOrderStatus } from '../../../services/buffetOrders';
import { ensureCsrf } from '../../../services/http';
import type { BuffetOrderReadDTO, OrderStatus } from '../../../types/api-types';

const AK_DARK = '#0B2D24';

function money(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'CHF 0.00';
  return `CHF ${n.toFixed(2)}`;
}

function StatusChip({ status }: { status?: string }) {
  const map: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    NEW: 'warning',
    CONFIRMED: 'success',
    PREPARING: 'info',
    COMPLETED: 'success',
    CANCELLED: 'default',
    REJECTED: 'error',
  };
  const color = map[status || ''] || 'default';
  return <Chip size="small" label={status || '-'} color={color as any} />;
}

export default function BuffetOrdersAdminPage() {
  const [rows, setRows] = React.useState<BuffetOrderReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string>();
  const [savingId, setSavingId] = React.useState<string>();

  const load = async () => {
    setErr(undefined);
    setLoading(true);
    try {
      const data = await listAllBuffetOrders();
      data.sort(
        (a, b) =>
          new Date((b as any).createdAt as any).getTime() -
          new Date((a as any).createdAt as any).getTime()
      );
      setRows(data);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load buffet orders');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: string, next: string) => {
    try {
      setSavingId(id);
      await ensureCsrf();
      const updated = await updateBuffetOrderStatus(id, next as unknown as OrderStatus);
      setRows(prev => prev.map(r => (String((r as any).id) === String(id) ? (updated as any) : r)));
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingId(undefined);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: AK_DARK }}>Buffet Orders</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={load} startIcon={<RefreshIcon />}>Refresh</Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid rgba(11,45,36,.12)' }}>
        {loading ? (
          <Box sx={{ p: 4, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => {
                  const anyR = r as any;
                  const id = String(anyR.id);
                  const name = `${anyR.customerInfo?.firstName ?? ''} ${anyR.customerInfo?.lastName ?? ''}`.trim() || '-';
                  const created = anyR.createdAt ? new Date(anyR.createdAt as any).toLocaleString() : '-';

                  // 👇 Robustly derive items count regardless of DTO property naming
                  const itemsArray =
                    anyR.items ??
                    anyR.orderItems ??
                    anyR.buffetItems ??
                    anyR.lines ??
                    [];
                  const itemsCount = Array.isArray(itemsArray) ? itemsArray.length : '-';

                  const payment = anyR.paymentStatus ?? '-';
                  const total = anyR.totalPrice as number | undefined;

                  const options = ['NEW', 'CONFIRMED', 'PREPARING', 'COMPLETED', 'CANCELLED', 'REJECTED'];

                  return (
                    <TableRow key={id}>
                      <TableCell>{created}</TableCell>
                      <TableCell>{anyR.orderType ?? '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {anyR.customerInfo?.phone || anyR.customerInfo?.email || ''}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{itemsCount}</TableCell>
                      <TableCell><StatusChip status={String(payment)} /></TableCell>
                      <TableCell>{money(total)}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={anyR.status ?? 'NEW'}
                          onChange={e => handleStatusChange(id, e.target.value as string)}
                          disabled={savingId === id}
                          sx={{ minWidth: 140 }}
                        >
                          {options.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Mark confirmed">
                          <span>
                            <IconButton
                              size="small"
                              disabled={savingId === id}
                              onClick={() => handleStatusChange(id, 'CONFIRMED')}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <span>
                            <IconButton
                              size="small"
                              disabled={savingId === id}
                              onClick={() => handleStatusChange(id, 'CANCELLED')}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                        No buffet orders yet.
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
