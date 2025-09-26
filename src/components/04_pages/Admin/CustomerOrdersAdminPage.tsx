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
  Tooltip,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { notifyError, notifySuccess } from "../../../services/toast";
import { CustomerOrderReadDTO, OrderStatus } from "../../../types/api-types";
import {
  listAllCustomerOrders,
  updateCustomerOrderStatus,
} from "../../../services/customerOrders";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";
import { printCustomerOrder } from "../../../services/printing";

const AK_DARK = "#0B2D24";
const STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

const PRINTED_KEY = "ak_printed_menu_v1";

function loadPrinted(): Set<string> {
  try {
    const arr = JSON.parse(
      localStorage.getItem(PRINTED_KEY) || "[]"
    ) as string[];
    const s = new Set<string>();
    arr.forEach((v) => s.add(v));
    return s;
  } catch {
    return new Set<string>();
  }
}
function savePrinted(set: Set<string>) {
  const arr: string[] = [];
  set.forEach((v) => arr.push(v));
  localStorage.setItem(PRINTED_KEY, JSON.stringify(arr));
}

export default function CustomerOrdersAdminPage() {
  const [rows, setRows] = React.useState<CustomerOrderReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const { markSeen } = useAdminAlerts();
  const printedRef = React.useRef<Set<string>>(loadPrinted());

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAllCustomerOrders(); // SUCCEEDED only
      setRows(data);
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
    markSeen("orders").catch(() => {});
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-print newly paid orders (not printed before)
  React.useEffect(() => {
    rows.forEach((o) => {
      const id = String(o.id);
      if (o.paymentStatus === "SUCCEEDED" && !printedRef.current.has(id)) {
        try {
          printCustomerOrder(o);
          printedRef.current.add(id);
          savePrinted(printedRef.current);
        } catch {
          /* ignore */
        }
      }
    });
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

  const onPrint = (o: CustomerOrderReadDTO) => {
    try {
      printCustomerOrder(o);
      const id = String(o.id);
      printedRef.current.add(id);
      savePrinted(printedRef.current);
    } catch {
      /* ignore */
    }
  };

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
            <TableCell>Print</TableCell>
            <TableCell align="right">Progress</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8}>No orders</TableCell>
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
                  <Chip label={o.paymentStatus || "N/A"} size="small" />
                </TableCell>
                <TableCell>
                  <Tooltip title="Print receipt">
                    <span>
                      <IconButton
                        onClick={() => onPrint(o)}
                        size="small"
                        color="primary"
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Select
                      value={o.status as string}
                      disabled={savingId === id}
                      onChange={(e: SelectChangeEvent<string>) => {
                        const next = e.target.value as OrderStatus;
                        if (next && next !== o.status) onChangeStatus(id, next);
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <MenuItem key={s} value={s} disabled={s === o.status}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
