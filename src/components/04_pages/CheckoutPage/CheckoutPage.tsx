import * as React from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Box,
  Button,
  Typography,
  Alert,
  Divider,
  Paper,
  TextField,
} from "@mui/material";

import { useCart } from "../../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import type {
  OrderType,
  BuffetOrderWriteDTO,
  CustomerOrderWriteDTO,
  CustomerInfoDTO,
} from "../../../types/api-types";
import { createBuffetOrder } from "../../../services/buffetOrders";
import { createCustomerOrder } from "../../../services/customerOrders";
import {
  createIntentForBuffetOrder,
  createIntentForCustomerOrder,
} from "../../../services/payment";
import { stripePromise } from "../../../stripe";
import { ensureCsrf } from "../../../services/http";

/** ----------------------------- Helpers ------------------------------ */

const GOLD = "#D4A017";
const GOLD_HOVER = "#BD8E12";
const CARD_BG = "#0F2A26"; // dark panel background used on the payment element wrapper
const VAT_RATE = 0.026;

type Errors = Record<string, string>;

const emptyCustomer: CustomerInfoDTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

function formatChf(n: number) {
  if (!isFinite(n)) n = 0;
  return `CHF ${n.toFixed(2)}`;
}

function computeDeliveryFee(orderType: OrderType, itemsSubtotal: number) {
  if (orderType !== "DELIVERY") return 0;
  if (itemsSubtotal > 25 && itemsSubtotal < 50) return 3;
  if (itemsSubtotal > 50) return 5;
  return 0;
}

/** --------------------------- Payment Step --------------------------- */

function PaymentStep({
  totalToPay,
}: {
  totalToPay: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = React.useState(false);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/thank-you` },
      redirect: "if_required",
    });
    setSubmitting(false);
    if (error) alert(error.message);
    else window.location.href = "/thank-you";
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", display: "grid", gap: 2 }}>
      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          background: CARD_BG,
        }}
      >
        <PaymentElement />
      </Box>

      <Button
        disabled={!stripe || submitting}
        variant="contained"
        onClick={onPay}
        sx={{
          mt: 1,
          alignSelf: "center",
          px: 4,
          py: 1.25,
          fontWeight: 700,
          borderRadius: 999,
          textTransform: "none",
          bgcolor: GOLD,
          "&:hover": { bgcolor: GOLD_HOVER },
        }}
      >
        Pay {formatChf(totalToPay)}
      </Button>
    </Box>
  );
}

/** --------------------------- Main Component ------------------------- */

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total: cartTotal = 0 } = useCart();

  // normalize cart lines (supports old/new shapes)
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      kind: "MENU" | "BUFFET";
      id: string;
      quantity: number;
      price?: number; // if present, cartTotal already sums these
    }>;
  }, [state]);

  const orderType: OrderType = (state?.orderType ?? "TAKEAWAY") as OrderType;

  // Client-side amounts (mirror backend logic)
  const itemsSubtotal = Number(cartTotal ?? 0) || 0;
  const vat = Number((itemsSubtotal * VAT_RATE).toFixed(2));
  const deliveryFee = computeDeliveryFee(orderType, itemsSubtotal);
  const grand = Number((itemsSubtotal + vat + deliveryFee).toFixed(2));

  // local state
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] =
    React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // validation (must match backend expectations)
  const validate = (c: CustomerInfoDTO): Errors => {
    const e: Errors = {};
    const req = (v?: string) => !v || !v.trim();

    if (req(c.firstName)) e.firstName = "Required";
    if (req(c.lastName)) e.lastName = "Required";
    if (req(c.email) || !/.+@.+\..+/.test(c.email)) e.email = "Valid email required";
    if (req(c.phone)) e.phone = "Required";

    // Address required for both takeaway/delivery (your backend requires it)
    if (req(c.address.street)) e["address.street"] = "Required";
    if (req(c.address.streetNo)) e["address.streetNo"] = "Required";
    if (req(c.address.plz)) e["address.plz"] = "Required";
    if (req(c.address.city)) e["address.city"] = "Required";

    return e;
  };

  const applyBackendErrors = (details: Record<string, string>) => {
    const mapped: Errors = {};
    Object.entries(details).forEach(([k, v]) => {
      const short = k.replace(/^customerInfo\./, "");
      mapped[short] = v;
    });
    setFieldErrors(mapped);
  };

  const handleInput =
    (path: string) => (ev: React.ChangeEvent<HTMLInputElement>) => {
      const v = ev.target.value;
      setCustomer((prev) => {
        const next = { ...prev, address: { ...prev.address } };
        switch (path) {
          case "firstName": next.firstName = v; break;
          case "lastName": next.lastName = v; break;
          case "email": next.email = v; break;
          case "phone": next.phone = v; break;
          case "address.street": next.address.street = v; break;
          case "address.streetNo": next.address.streetNo = v; break;
          case "address.plz": next.address.plz = v; break;
          case "address.city": next.address.city = v; break;
        }
        return next;
      });
    };

  const preparePayment = async () => {
    try {
      setError(undefined);
      setFieldErrors({});

      if (!cartLines.length || itemsSubtotal <= 0) {
        setError("Your cart is empty.");
        return;
      }

      const hasMenu = cartLines.some((l) => l.kind === "MENU");
      const hasBuffet = cartLines.some((l) => l.kind === "BUFFET");
      if (hasMenu && hasBuffet) {
        setError("Mixed cart (menu + buffet) is not supported yet. Please order them separately.");
        return;
      }

      const errs = validate(customer);
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setError("Please fix the highlighted fields.");
        return;
      }

      setPreparing(true);
      await ensureCsrf();

      if (hasMenu) {
        const payload: CustomerOrderWriteDTO = {
          userId: undefined,
          customerInfo: customer,
          orderType,
          specialInstructions: undefined,
          items: cartLines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })),
        };
        const order = await createCustomerOrder(payload);
        const pi = await createIntentForCustomerOrder(order.id);
        setClientSecret(pi.clientSecret);
      } else if (hasBuffet) {
        const payload: BuffetOrderWriteDTO = {
          userId: undefined,
          customerInfo: customer,
          orderType,
          specialInstructions: undefined,
          items: cartLines.map((l) => ({ buffetItemId: l.id, quantity: l.quantity })),
        };
        const order = await createBuffetOrder(payload);
        const pi = await createIntentForBuffetOrder(order.id);
        setClientSecret(pi.clientSecret);
      }
    } catch (e: any) {
      console.error(e);
      // zone/validation error from backend (400) -> show message
      const backendMsg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message;
      if (backendMsg) setError(backendMsg);

      const details = e?.response?.data?.details as Record<string, string> | undefined;
      if (details) applyBackendErrors(details);
    } finally {
      setPreparing(false);
    }
  };

  /** --------------------------- Render --------------------------- */

  // Step 1: Details
  if (!clientSecret) {
    return (
      <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
        {/* Step pills (read-only) */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <Button size="small" variant="contained" disableElevation
            sx={{ pointerEvents: "none", bgcolor: GOLD, "&:hover": { bgcolor: GOLD } }}>
            1. Details
          </Button>
          <Button size="small" variant="outlined" disabled sx={{ pointerEvents: "none", color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}>
            2. Payment
          </Button>
          <Box sx={{ ml: "auto", color: "rgba(255,255,255,0.8)", alignSelf: "center", fontWeight: 600 }}>
            {orderType === "DELIVERY" ? "Delivery" : "Takeaway"}
          </Box>
        </Box>

        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 380px" } }}>
          {/* Details card */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#fff" }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: "#122420" }}>
              Your details
            </Typography>

            <Box sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }
            }}>
              {[
                { label: "First name", path: "firstName" },
                { label: "Last name", path: "lastName" },
                { label: "Email", path: "email", type: "email" },
                { label: "Phone", path: "phone" },
                { label: "Street", path: "address.street", full: true },
                { label: "No.", path: "address.streetNo" },
                { label: "PLZ", path: "address.plz" },
                { label: "City", path: "address.city" },
              ].map((f) => (
                <TextField
                  key={f.path}
                  label={f.label}
                  type={f.type as any}
                  fullWidth
                  value={
                    f.path === "firstName" ? customer.firstName :
                    f.path === "lastName" ? customer.lastName :
                    f.path === "email" ? customer.email :
                    f.path === "phone" ? customer.phone :
                    f.path === "address.street" ? customer.address.street :
                    f.path === "address.streetNo" ? customer.address.streetNo :
                    f.path === "address.plz" ? customer.address.plz :
                    customer.address.city
                  }
                  onChange={handleInput(f.path)}
                  error={!!fieldErrors[f.path as keyof Errors]}
                  helperText={fieldErrors[f.path as keyof Errors]}
                  sx={{ gridColumn: f.full ? "1 / -1" : "auto" }}
                  InputLabelProps={{
                    sx: {
                      color: "rgba(0,0,0,0.55)",
                      "&.Mui-focused": { color: "rgba(0,0,0,0.55)" },
                      fontWeight: 600,
                    },
                  }}
                />
              ))}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}

            <Box sx={{ mt: 2, display: "flex", gap: 1.5 }}>
              <Button variant="outlined" onClick={() => navigate("/menu")} sx={{ borderRadius: 999, textTransform: "none" }}>
                Back to Menu
              </Button>
              <Button
                variant="contained"
                onClick={preparePayment}
                disabled={preparing}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  px: 3,
                  bgcolor: GOLD,
                  "&:hover": { bgcolor: GOLD_HOVER },
                  fontWeight: 700,
                }}
              >
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Box>
          </Paper>

          {/* Order summary (mirrors backend math) */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: "#fff" }}>
              Order summary
            </Typography>
            <Box sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, display: "grid", gap: 1.25 }}>
              <Row label="Subtotal" value={formatChf(itemsSubtotal)} />
              <Row label="VAT (2.6%)" value={formatChf(vat)} />
              <Row label="Delivery fee" value={formatChf(deliveryFee)} />
              <Divider sx={{ my: 1 }} />
              <Row label="Total" value={formatChf(grand)} emphasize />
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  // Step 2: Payment
  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        <Button size="small" variant="outlined" disabled sx={{ pointerEvents: "none", color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}>
          1. Details
        </Button>
        <Button size="small" variant="contained" disableElevation
          sx={{ pointerEvents: "none", bgcolor: GOLD, "&:hover": { bgcolor: GOLD } }}>
          2. Payment
        </Button>
        <Box sx={{ ml: "auto", color: "rgba(255,255,255,0.8)", alignSelf: "center", fontWeight: 600 }}>
          {orderType === "DELIVERY" ? "Delivery" : "Takeaway"}
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 380px" } }}>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentStep totalToPay={grand} />
        </Elements>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: "#fff" }}>
            Order summary
          </Typography>
          <Box sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, display: "grid", gap: 1.25 }}>
            <Row label="Subtotal" value={formatChf(itemsSubtotal)} />
            <Row label="VAT (2.6%)" value={formatChf(vat)} />
            <Row label="Delivery fee" value={formatChf(deliveryFee)} />
            <Divider sx={{ my: 1 }} />
            <Row label="Total" value={formatChf(grand)} emphasize />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

/** Simple two-column row for the summary */
function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ opacity: 0.9 }}>{label}</span>
      <span style={{ fontWeight: emphasize ? 800 : 700 }}>{value}</span>
    </Box>
  );
}
