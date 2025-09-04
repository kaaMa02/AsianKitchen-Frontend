// src/components/04_pages/CheckoutPage/CheckoutPage.tsx
import * as React from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Box,
  Button,
  Typography,
  Alert,
  TextField,
  Paper,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../../contexts/CartContext";
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
import { ensureCsrf } from "../../../services/http";
import { stripePromise } from "../../../stripe";

// ─────────────────────────────────────────────────────────────────────────────
// Display VAT — keep this in sync with the backend
const VAT_RATE = 0.026;

type Errors = Record<string, string>;

const emptyCustomer: CustomerInfoDTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

// Small helper to 2-decimals
const chf = (n: number) => `CHF ${n.toFixed(2)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Payment step (Stripe UI)
function PaymentStep() {
  const stripe = useStripe();
  const elements = useElements();
  const { total } = useCart();

  // Match backend by showing total + VAT
  const estimatedVat = React.useMemo(() => total * VAT_RATE, [total]);
  const estimatedGrand = React.useMemo(() => total + estimatedVat, [total, estimatedVat]);

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
    <Box sx={{ maxWidth: 520, mx: "auto", display: "grid", gap: 2 }}>
      <PaymentElement />
      <Button
        disabled={!stripe || submitting}
        variant="contained"
        onClick={onPay}
        sx={{ bgcolor: "#0B2D24", "&:hover": { bgcolor: "#0a241c" } }}
      >
        Pay {chf(estimatedGrand)}
      </Button>
      <Typography variant="body2" sx={{ opacity: 0.7, textAlign: "center" }}>
        You’ll be charged the total shown above (incl. VAT).
      </Typography>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total } = useCart();

  // Hooks: keep all at top, no early returns before hooks
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] = React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // Cart lines (normalize shapes)
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      kind: "MENU" | "BUFFET";
      id: string;
      quantity: number;
      priceChf?: number;
    }>;
  }, [state]);

  // Summary (display only)
  const estimatedVat = React.useMemo(() => total * VAT_RATE, [total]);
  const estimatedGrand = React.useMemo(() => total + estimatedVat, [total, estimatedVat]);

  // Validation (mirror backend NotBlank)
  const validate = (c: CustomerInfoDTO): Errors => {
    const e: Errors = {};
    const req = (v?: string) => !v || !v.trim();

    if (req(c.firstName)) e.firstName = "Required";
    if (req(c.lastName)) e.lastName = "Required";
    if (req(c.email) || !/.+@.+\..+/.test(c.email)) e.email = "Valid email required";
    if (req(c.phone)) e.phone = "Required";

    // Address required for both delivery and takeaway (as per backend)
    if (req(c.address.street)) e["address.street"] = "Required";
    if (req(c.address.streetNo)) e["address.streetNo"] = "Required";
    if (req(c.address.plz)) e["address.plz"] = "Required";
    if (req(c.address.city)) e["address.city"] = "Required";

    return e;
  };

  // Map backend validation paths → field names
  const applyBackendErrors = (details: Record<string, string>) => {
    const mapped: Errors = {};
    Object.entries(details).forEach(([k, v]) => {
      const short = k.replace(/^customerInfo\./, ""); // e.g. customerInfo.address.plz → address.plz
      mapped[short] = v;
    });
    setFieldErrors(mapped);
  };

  // Controlled inputs
  const handleInput =
    (path: string) =>
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const v = ev.target.value;
      setCustomer((prev) => {
        const next = { ...prev, address: { ...prev.address } };
        switch (path) {
          case "firstName":
            next.firstName = v;
            break;
          case "lastName":
            next.lastName = v;
            break;
          case "email":
            next.email = v;
            break;
          case "phone":
            next.phone = v;
            break;
          case "address.street":
            next.address.street = v;
            break;
          case "address.streetNo":
            next.address.streetNo = v;
            break;
          case "address.plz":
            next.address.plz = v;
            break;
          case "address.city":
            next.address.city = v;
            break;
        }
        return next;
      });
    };

  // Prepare PaymentIntent after collecting details
  const preparePayment = async () => {
    try {
      setError(undefined);
      setFieldErrors({});

      if (!cartLines.length) {
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

      const orderType: OrderType = state.orderType;

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
      const details = e?.response?.data?.details as Record<string, string> | undefined;
      if (details) {
        applyBackendErrors(details);
        setError("Please correct the highlighted fields.");
      } else {
        setError("Failed to prepare checkout. Please try again.");
      }
    } finally {
      setPreparing(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render

  if (!clientSecret) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 980, mx: "auto" }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0B2D24", mb: 2 }}>
          Checkout
        </Typography>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
            alignItems: "start",
          }}
        >
          {/* Left: Details */}
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, color: "#0B2D24", mb: 1.5 }}>Your details</Typography>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              }}
            >
              <TextField
                label="First name"
                fullWidth
                value={customer.firstName}
                onChange={handleInput("firstName")}
                error={!!fieldErrors.firstName}
                helperText={fieldErrors.firstName}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
              />
              <TextField
                label="Last name"
                fullWidth
                value={customer.lastName}
                onChange={handleInput("lastName")}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                value={customer.email}
                onChange={handleInput("email")}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
              />
              <TextField
                label="Phone"
                fullWidth
                value={customer.phone}
                onChange={handleInput("phone")}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
              />

              <TextField
                label="Street"
                fullWidth
                value={customer.address.street}
                onChange={handleInput("address.street")}
                error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
                sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
              />
              <TextField
                label="No."
                fullWidth
                value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")}
                error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
              />

              <TextField
                label="PLZ"
                fullWidth
                value={customer.address.plz}
                onChange={handleInput("address.plz")}
                error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
              />
              <TextField
                label="City"
                fullWidth
                value={customer.address.city}
                onChange={handleInput("address.city")}
                error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]}
                InputLabelProps={{ sx: { color: "rgba(11,45,36,0.6)" } }}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={() => navigate("/menu")}>
                Back to Menu
              </Button>
              <Button
                variant="contained"
                onClick={preparePayment}
                disabled={preparing}
                sx={{ bgcolor: "#0B2D24", "&:hover": { bgcolor: "#0a241c" } }}
              >
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Box>
          </Paper>

          {/* Right: Summary */}
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, color: "#0B2D24" }}>Order summary</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: "grid", gap: 0.75 }}>
              <Row label="Subtotal" value={chf(total)} />
              <Row label={`VAT (${(VAT_RATE * 100).toFixed(1)}%)`} value={chf(estimatedVat)} />
              <Divider sx={{ my: 1 }} />
              <Row label="Total (incl. VAT)" value={chf(estimatedGrand)} bold />
            </Box>
            <Typography variant="caption" sx={{ mt: 1.5, display: "block", opacity: 0.7 }}>
              The final amount charged will match this total.
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  // Stripe payment step
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0B2D24", mb: 2 }}>
          Secure payment
        </Typography>
        <PaymentStep />
      </Box>
    </Elements>
  );
}

// Simple label/value row
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography sx={{ opacity: 0.85 }}>{label}</Typography>
      <Typography sx={{ fontWeight: bold ? 800 : 600 }}>{value}</Typography>
    </Box>
  );
}
