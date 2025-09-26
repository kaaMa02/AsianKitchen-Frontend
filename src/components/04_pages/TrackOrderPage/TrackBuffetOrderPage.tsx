import * as React from "react";
import {
  Box, Paper, Typography, Chip, Divider,
} from "@mui/material";
import { trackBuffetOrder } from "../../../services/tracking";
import type { BuffetOrderReadDTO } from "../../../types/api-types";
import OrderStatusStepper from "../../common/OrderStatusStepper";

export default function TrackBuffetOrderPage() {
  const [data, setData] = React.useState<BuffetOrderReadDTO | null>(null);
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
        const d = await trackBuffetOrder(orderId, email);
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

  return (
    <Paper elevation={0} sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
        Track your buffet order
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Chip label={`Order ID: ${data.id}`} />
        <Chip label={`Payment: ${data.paymentStatus ?? "N/A"}`} color={data.paymentStatus === "SUCCEEDED" ? "success" : "default"} />
        <Chip label={`Total: CHF ${Number(data.totalPrice || 0).toFixed(2)}`} />
        <Chip label={`Placed: ${String(data.createdAt).replace("T", " ").slice(0, 16)}`} />
      </Box>

      <OrderStatusStepper status={data.status} />

      <Divider sx={{ my: 2 }} />

      {/* If you store buffet-specific details, render here */}
      <Typography variant="body2">
        Thanks for your order! We’ll keep this page updated as your buffet is prepared.
      </Typography>
    </Paper>
  );
}
