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
  Stack,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

import { notifyError, notifySuccess } from "../../../services/toast";
import {
  CustomerOrderReadDTO,
  OrderStatus,
  PaymentMethod,
} from "../../../types/api-types";
import {
  listAllCustomerOrders,
  updateCustomerOrderStatus,
} from "../../../services/customerOrders";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";
import {
  printCustomerOrderReceipt,
  autoPrintNewPaidMenu,
  canPrintNow,
} from "../../../services/printing";

const AK_DARK = "#0B2D24";

const STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

export default function CustomerOrdersAdminPage() {
  const [rows, setRows] = React.useState<CustomerOrderReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const { markSeen } = useAdminAlerts();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAllCustomerOrders(); // includes SUCCEEDED + CASH
      setRows(data ?? []);
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
    markSeen("orders").catch(() => {});
  };

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (rows.length) void autoPrintNewPaidMenu(rows);
  }, [rows]);

  const onChangeStatus = async (id: string, next: OrderStatus) => {
    try {
      setSavingId(id);
      await updateCustomerOrderStatus(id, next);
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

  const renderPaymentChips = (o: CustomerOrderReadDTO) => (
    <Stack direction="row" spacing={0.5}>
      <Chip
        label={o.paymentMethod ?? "—"}
        size="small"
        color={o.paymentMethod === PaymentMethod.CASH ? "warning" : "default"}
      />
      <Chip
        label={o.paymentStatus ?? "N/A"}
        size="small"
        color={o.paymentStatus === "SUCCEEDED" ? "success" : "default"}
      />
    </Stack>
  );

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}
    >
      <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
        Menu Orders
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
            const printEnabled = canPrintNow(o);
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
                <TableCell>{renderPaymentChips(o)}</TableCell>
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
                    onClick={() => printCustomerOrderReceipt(o)}
                    disabled={!printEnabled}
                    title={
                      printEnabled
                        ? "Print receipt"
                        : "Print is enabled after payment"
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
