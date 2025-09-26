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
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  IconButton,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

import {
  listAllBuffetOrders,
  updateBuffetOrderStatus,
} from "../../../services/buffetOrders";
import { notifyError, notifySuccess } from "../../../services/toast";
import { BuffetOrderReadDTO, OrderStatus } from "../../../types/api-types";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";
import {
  printCustomerOrderReceipt,
  autoPrintNewPaid,
} from "../../../services/printing";

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
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const { markSeen } = useAdminAlerts();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAllBuffetOrders(); // paid buffet orders
      setRows(data ?? []);
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load buffet orders");
    } finally {
      setLoading(false);
    }
    markSeen("buffet").catch(() => {});
  };

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (rows.length) void autoPrintNewPaid(rows as any);
  }, [rows]);

  const onChangeStatus = async (id: string, next: OrderStatus) => {
    try {
      setSavingId(id);
      await updateBuffetOrderStatus(id, next);
      setRows((prev) =>
        prev.map((o) => (String(o.id) === id ? { ...o, status: next } : o))
      );
      notifySuccess("Order status updated");
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to update status");
      await load();
    } finally {
      setSavingId(null);
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
            <TableCell align="right">Progress / Print</TableCell>
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
            const canPrint = o.paymentStatus === "SUCCEEDED";
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
                  <Chip
                    label={o.paymentStatus || "N/A"}
                    size="small"
                    color={canPrint ? "success" : "default"}
                  />
                </TableCell>
                <TableCell align="right">
                  <FormControl size="small" sx={{ minWidth: 180, mr: 1 }}>
                    <Select
                      value={o.status as string}
                      disabled={savingId === id}
                      onChange={(e: SelectChangeEvent<string>) => {
                        const next = e.target.value as OrderStatus;
                        if (next && next !== o.status)
                          void onChangeStatus(id, next);
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <MenuItem key={s} value={s} disabled={s === o.status}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton
                    aria-label="Print receipt"
                    size="small"
                    onClick={() => printCustomerOrderReceipt(o as any)}
                    disabled={!canPrint}
                    title={
                      canPrint ? "Print receipt" : "Print enabled after payment"
                    }
                  >
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
