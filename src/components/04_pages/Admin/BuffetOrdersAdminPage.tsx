import * as React from "react";
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
} from "@mui/material";
import {
  listAllBuffetOrders,
  updateBuffetOrderStatus,
} from "../../../services/buffetOrders";
import { notifyError, notifySuccess } from "../../../services/toast";
import { BuffetOrderReadDTO, OrderStatus } from "../../../types/api-types";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

export default function BuffetOrdersAdminPage() {
  const [rows, setRows] = React.useState<BuffetOrderReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { markSeen } = useAdminAlerts();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllBuffetOrders(); // backend returns PAID + NEW
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

  const setStatus = async (id: string, s: OrderStatus) => {
    try {
      await updateBuffetOrderStatus(id, s);
      notifySuccess("Updated");
      await load();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to update");
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
          {rows.map((o) => (
            <TableRow key={String(o.id)}>
              <TableCell>
                {String(o.createdAt).replace("T", " ").slice(0, 16)}
              </TableCell>
              <TableCell>
                {o.customerInfo?.firstName} {o.customerInfo?.lastName}
              </TableCell>
              <TableCell>{o.orderType}</TableCell>
              <TableCell>CHF {Number(o.totalPrice || 0).toFixed(2)}</TableCell>
              <TableCell>
                <Chip label={o.status} size="small" />
              </TableCell>
              <TableCell>
                <Chip label={o.paymentStatus || "N/A"} size="small" />
              </TableCell>
              <TableCell align="right">
                <Button
                  onClick={() => setStatus(String(o.id), OrderStatus.CONFIRMED)}
                  size="small"
                  variant="contained"
                  sx={{
                    bgcolor: AK_GOLD,
                    color: AK_DARK,
                    "&:hover": { bgcolor: "#E2B437" },
                  }}
                >
                  Confirm
                </Button>
                <Button
                  onClick={() => setStatus(String(o.id), OrderStatus.CANCELLED)}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 1 }}
                >
                  Cancel
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
