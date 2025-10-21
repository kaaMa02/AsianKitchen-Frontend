import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Paper,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import type { CustomerOrderReadDTO } from "../../../types/api-types";
import { trackCustomerOrder } from "../../../services/customerOrders";

const AK_DARK = "#0B2D24";

export default function TrackMenuOrderPage() {
  const [sp] = useSearchParams();
  const orderId = sp.get("orderId") || "";
  const email = sp.get("email") || "";

  const [data, setData] = React.useState<CustomerOrderReadDTO | null>(null);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!orderId || !email) {
      setError("Missing orderId or email in the link.");
      setLoading(false);
      return;
    }
    try {
      setError(undefined);
      const res = await trackCustomerOrder(orderId, email);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not find your order.");
    } finally {
      setLoading(false);
    }
  }, [orderId, email]);

  React.useEffect(() => {
    void load();
    const t = setInterval(load, 15_000); // auto-refresh every 15s
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: "auto", textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const ci = data.customerInfo || ({} as any);
  const fmt = (v?: any) => (v ? String(v).replace("T", " ").slice(0, 16) : "—");
  const requestedAt: any =
    (data as any).requestedAt ||
    (data as any).timing?.requestedAt ||
    (data as any).committedReadyAt;
  const asap: boolean =
    Boolean((data as any).asap) ||
    Boolean((data as any).timing?.asap) ||
    !requestedAt;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: AK_DARK, mb: 2 }}>
        Track your order
      </Typography>

      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid rgba(11,45,36,.12)" }}
      >
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography variant="body2" sx={{ color: AK_DARK }}>
            <strong>Order ID:</strong> {data.id}
          </Typography>
          <Typography variant="body2" sx={{ color: AK_DARK }}>
            <strong>Placed:</strong> {fmt(data.createdAt)}
          </Typography>
          <Typography variant="body2" sx={{ color: AK_DARK }}>
            <strong>Deliver:</strong> {asap ? "ASAP" : fmt(requestedAt)}
          </Typography>
          <Typography variant="body2" sx={{ color: AK_DARK }}>
            <strong>Name:</strong> {ci.firstName} {ci.lastName}
          </Typography>
          <Typography variant="body2" sx={{ color: AK_DARK }}>
            <strong>Type:</strong> {data.orderType}
          </Typography>
          <Typography variant="body2" sx={{ color: AK_DARK }}>
            <strong>Total:</strong> CHF{" "}
            {Number(data.totalPrice || 0).toFixed(2)}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip label={`Status: ${data.status}`} color="primary" />{" "}
            {data.paymentMethod && (
              <Chip
                label={`Payment: ${data.paymentMethod}${
                  data.paymentStatus === "SUCCEEDED" ? " · PAID" : ""
                }`}
                sx={{ ml: 1 }}
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, color: AK_DARK, mb: 1 }}
        >
          Items
        </Typography>
        <Box sx={{ display: "grid", gap: 0.5 }}>
          {(data.orderItems || []).map((it) => (
            <Typography
              key={String(it.menuItemId)}
              variant="body2"
              sx={{ color: AK_DARK }}
            >
              {it.quantity} × {it.menuItemName} — CHF{" "}
              {Number(it.unitPrice || 0).toFixed(2)}
            </Typography>
          ))}
        </Box>

        {data.specialInstructions && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: AK_DARK }}
            >
              Note from you
            </Typography>
            <Typography variant="body2">{data.specialInstructions}</Typography>
          </>
        )}
      </Paper>

      <Typography variant="body2" sx={{ mt: 2, color: AK_DARK }}>
        This page refreshes automatically every 15 seconds.
      </Typography>
    </Box>
  );
}
