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
  Box,
} from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import {
  listAllBuffetOrders,
  updateBuffetOrderStatus,
} from "../../../services/buffetOrders";
import { notifyError, notifySuccess } from "../../../services/toast";
import { BuffetOrderReadDTO, OrderStatus } from "../../../types/api-types";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";
import { printOrderViaRawBT } from "../../../services/printing";

const AK_DARK = "#0B2D24";
const STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

const PRINTED_KEY = "ak_printed_buffet";
function loadPrinted(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PRINTED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function savePrinted(s: Set<string>) {
  localStorage.setItem(PRINTED_KEY, JSON.stringify(Array.from(s)));
}

export default function BuffetOrdersAdminPage() {
  const [rows, setRows] = React.useState<BuffetOrderReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const printedRef = React.useRef<Set<string>>(loadPrinted());
  const { markSeen } = useAdminAlerts();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAllBuffetOrders(); // returns all paid buffet orders
      setRows(data);
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load buffet orders");
    } finally {
      setLoading(false);
    }
    markSeen("buffet").catch(() => {});
  };

  React.useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, []);

  // auto-print once per paid order
  React.useEffect(() => {
    if (!rows?.length) return;
    const printed = printedRef.current;
    let changed = false;

    rows.forEach((o) => {
      const id = String(o.id);
      if (o.paymentStatus === "SUCCEEDED" && !printed.has(id)) {
        try {
          printOrderViaRawBT(o, "BUFFET");
        } catch {}
        printed.add(id);
        changed = true;
      }
    });

    if (changed) savePrinted(printed);
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
            <TableCell align="right">Actions</TableCell>
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
                    color={
                      o.paymentStatus === "SUCCEEDED" ? "success" : "default"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "inline-flex", gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <Select
                        value={o.status as string}
                        disabled={savingId === id}
                        onChange={(e: SelectChangeEvent<string>) => {
                          const next = e.target.value as OrderStatus;
                          if (next && next !== o.status)
                            onChangeStatus(id, next);
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <MenuItem key={s} value={s} disabled={s === o.status}>
                            {s}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Manual print button */}
                    <IconButton
                      size="small"
                      aria-label="Print"
                      onClick={() => printOrderViaRawBT(o, "BUFFET")}
                      title="Print receipt"
                    >
                      <PrintRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
