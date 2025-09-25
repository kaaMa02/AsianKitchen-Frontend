import * as React from "react";
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Box,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  listAllBuffetOrders,
  updateBuffetOrderStatus,
} from "../../../services/buffetOrders";
import { notifyError, notifySuccess } from "../../../services/toast";
import { BuffetOrderReadDTO, OrderStatus } from "../../../types/api-types";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";

const AK_DARK = "#0B2D24";

const STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

export default function BuffetOrdersAdminPage() {
  const [rows, setRows] = React.useState<BuffetOrderReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const { markSeen } = useAdminAlerts();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      // Backend should return ALL buffet orders with paymentStatus=SUCCEEDED
      const data = await listAllBuffetOrders();
      const sorted = [...data].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );
      setRows(sorted);
      await markSeen("buffet");
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load buffet orders");
    } finally {
      setLoading(false);
    }
  }, [markSeen]);

  React.useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, next: OrderStatus) => {
    setBusy((m) => ({ ...m, [id]: true }));
    try {
      await updateBuffetOrderStatus(id, next);
      notifySuccess("Order updated");
      setRows((prev) =>
        prev.map((o) => (String(o.id) === id ? { ...o, status: next } : o))
      );
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to update");
    } finally {
      setBusy((m) => ({ ...m, [id]: false }));
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}
    >
      <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
        Buffet Orders
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Created</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Progress</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>No orders</TableCell>
            </TableRow>
          )}

          {rows.map((o) => {
            const id = String(o.id);
            const isBusy = !!busy[id];
            return (
              <TableRow key={id}>
                <TableCell>
                  {String(o.createdAt).replace("T", " ").slice(0, 16)}
                </TableCell>
                <TableCell>
                  {o.customerInfo?.firstName} {o.customerInfo?.lastName}
                </TableCell>
                <TableCell>{o.orderType}</TableCell>
                <TableCell>
                  CHF {Number(o.totalPrice || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip label={o.status} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={o.paymentStatus || "N/A"} size="small" />
                </TableCell>

                <TableCell>
                  <Box sx={{ minWidth: 170 }}>
                    <FormControl fullWidth size="small" disabled={isBusy}>
                      <Select
                        value={o.status}
                        onChange={(e) =>
                          setStatus(id, e.target.value as OrderStatus)
                        }
                        renderValue={(v) => String(v)}
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <MenuItem
                            key={st}
                            value={st}
                            disabled={st === o.status}
                          >
                            {st}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  {isBusy && (
                    <Box
                      sx={{
                        display: "inline-flex",
                        ml: 1,
                        verticalAlign: "middle",
                      }}
                    >
                      <CircularProgress size={18} />
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
