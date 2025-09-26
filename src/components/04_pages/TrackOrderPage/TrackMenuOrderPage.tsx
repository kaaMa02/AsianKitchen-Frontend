import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { trackMenuOrder } from "../../../services/tracking";
import type { CustomerOrderReadDTO } from "../../../types/api-types";
import OrderStatusStepper from "../../common/OrderStatusStepper";

export default function TrackMenuOrderPage() {
  const [data, setData] = React.useState<CustomerOrderReadDTO | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get("orderId") || "";
    const email = url.searchParams.get("email") || "";

    if (!orderId || !email) {
      setError("Missing orderId or email.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const d = await trackMenuOrder(orderId, email);
        setData(d);
      } catch {
        setError("Order not found, or email does not match this order.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Box sx={{ p: 3 }}>Loading…</Box>;
  if (error) return <Box sx={{ p: 3, color: "error.main" }}>{error}</Box>;
  if (!data) return null;

  const items = Array.isArray(data.orderItems) ? data.orderItems : [];
  const hasUnitPrice = items.some(
    (oi: any) => typeof oi?.unitPrice !== "undefined"
  );
  const hasName = items.some(
    (oi: any) => typeof oi?.menuItemName !== "undefined"
  );

  const addr = (data.customerInfo as any)?.address;
  const isDelivery = data.orderType === "DELIVERY";
  const hasAddress =
    isDelivery &&
    addr &&
    (addr.street || addr.streetNo || addr.plz || addr.city);

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
        Track your order
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Chip label={`Order ID: ${data.id}`} />
        <Chip
          label={`Payment: ${data.paymentStatus ?? "N/A"}`}
          color={data.paymentStatus === "SUCCEEDED" ? "success" : "default"}
        />
        <Chip label={`Total: CHF ${Number(data.totalPrice || 0).toFixed(2)}`} />
        <Chip label={`Type: ${data.orderType}`} />
        <Chip
          label={`Placed: ${String(data.createdAt)
            .replace("T", " ")
            .slice(0, 16)}`}
        />
      </Box>

      <OrderStatusStepper status={data.status} />

      <Divider sx={{ my: 2 }} />

      {items.length > 0 && (
        <>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Items</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell width={100}>Qty</TableCell>
                {hasUnitPrice && (
                  <TableCell width={140} align="right">
                    Unit
                  </TableCell>
                )}
                {hasUnitPrice && (
                  <TableCell width={160} align="right">
                    Line Total
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((oi: any, i: number) => {
                const name: string =
                  (hasName ? oi.menuItemName : null) ?? `#${oi.menuItemId}`;
                const qty = oi.quantity ?? 1;
                const unit =
                  typeof oi.unitPrice !== "undefined"
                    ? Number(oi.unitPrice)
                    : undefined;
                const lineTotal =
                  typeof unit !== "undefined" ? unit * qty : undefined;

                return (
                  <TableRow key={i}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{qty}</TableCell>
                    {hasUnitPrice && (
                      <TableCell align="right">
                        {typeof unit !== "undefined"
                          ? `CHF ${unit.toFixed(2)}`
                          : "-"}
                      </TableCell>
                    )}
                    {hasUnitPrice && (
                      <TableCell align="right">
                        {typeof lineTotal !== "undefined"
                          ? `CHF ${lineTotal.toFixed(2)}`
                          : "-"}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}

      {hasAddress && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Delivery</Typography>
          <Typography variant="body2">
            {addr.street} {addr.streetNo}
            <br />
            {addr.plz} {addr.city}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
