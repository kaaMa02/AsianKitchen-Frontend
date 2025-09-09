// src/components/04_pages/CheckoutPage/CheckoutPage.tsx
import * as React from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Divider,
  Stack,
} from "@mui/material";
import TextField from "@mui/material/TextField";

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

// ──────────────────────────────────────────────────────────────────────────────
// Small helpers
// ──────────────────────────────────────────────────────────────────────────────
type Errors = Record<string, string>;

const emptyCustomer: CustomerInfoDTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

const VAT_RATE = 0.026; // 2.6%

function toCurrency(n: number) {
  return `CHF ${n.toFixed(2)}`;
}

function computeDeliveryFee(orderType: OrderType, subtotal: number) {
  if (orderType !== "DELIVERY") return 0;
  if (subtotal > 25 && subtotal < 50) return 3;
  if (subtotal > 50) return 5;
  return 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Payment step (left) + we’ll pass totals in
// ──────────────────────────────────────────────────────────────────────────────
function PaymentStep({ grandTotal }: { grandTotal: number }) {
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
    <Box sx={{ display: "grid", gap: 2 }}>
      <PaymentElement />
      <Button
        disabled={!stripe || submitting}
        variant="contained"
        onClick={onPay}
        sx={{
          bgcolor: "#D4A017",
          color: "#142B27",
          "&:hover": { bgcolor: "#C59612" },
          fontWeight: 700,
          py: 1.3,
        }}
      >
        Pay {toCurrency(grandTotal)}
      </Button>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Order summary card (right column)
// ──────────────────────────────────────────────────────────────────────────────
function SummaryCard({
  subtotal,
  vat,
  deliveryFee,
  grand,
}: {
  subtotal: number;
  vat: number;
  deliveryFee: number;
  grand: number;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        minWidth: 320,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        Order summary
      </Typography>

      <Stack spacing={1.2}>
        <Row label="Subtotal" value={toCurrency(subtotal)} />
        <Row label={`VAT (2.6%)`} value={toCurrency(vat)} />
        <Row label="Delivery fee" value={toCurrency(deliveryFee)} />
        <Divider sx={{ my: 1.2 }} />
        <Row label="Total" value={toCurrency(grand)} strong />
      </Stack>
    </Paper>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography sx={{ opacity: 0.85, fontWeight: strong ? 800 : 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: strong ? 800 : 600 }}>{value}</Typography>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total: cartTotal } = useCart();

  // numbers with safe defaults
  const orderType: OrderType = (state as any)?.orderType ?? "TAKEAWAY";
  const subtotal = Number(cartTotal) || 0;
  const vat = Math.max(0, +(subtotal * VAT_RATE).toFixed(2));
  const deliveryFee = computeDeliveryFee(orderType, subtotal);
  const grand = Math.max(0, +(subtotal + vat + deliveryFee).toFixed(2));

  // state
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] = React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // normalize cart lines (id/qty/kind) for the payload
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      kind: "MENU" | "BUFFET";
      id: string;
      quantity: number;
    }>;
  }, [state]);

  // validation (match BE)
  const validate = (c: CustomerInfoDTO): Errors => {
    const e: Errors = {};
    const req = (v?: string) => !v || !v.trim();

    if (req(c.firstName)) e.firstName = "Required";
    if (req(c.lastName)) e.lastName = "Required";
    if (req(c.email) || !/.+@.+\..+/.test(c.email)) e.email = "Valid email required";
    if (req(c.phone)) e.phone = "Required";

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

  // Create order + PI
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
      const msg = e?.response?.data?.message as string | undefined;

      if (details) {
        applyBackendErrors(details);
        setError("Please correct the highlighted fields.");
      } else if (msg) {
        setError(msg); // e.g., delivery zone rejection
      } else {
        setError("Failed to prepare checkout. Please try again.");
      }
    } finally {
      setPreparing(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  const TwoCol: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => (
    <Box
      sx={{
        mt: 4,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 360px" },
        gap: 3,
        alignItems: "start",
      }}
    >
      {left}
      {right}
    </Box>
  );

  // Step 1 — Details (no toggle here)
  if (!clientSecret) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto" }}>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
          Checkout
        </Typography>
        <Typography sx={{ opacity: 0.8, mb: 3 }}>
          Please provide your contact and address details.
        </Typography>

        <TwoCol
          left={
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Your details
              </Typography>

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
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                />
                <TextField
                  label="Last name"
                  fullWidth
                  value={customer.lastName}
                  onChange={handleInput("lastName")}
                  error={!!fieldErrors.lastName}
                  helperText={fieldErrors.lastName}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={customer.email}
                  onChange={handleInput("email")}
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                />
                <TextField
                  label="Phone"
                  fullWidth
                  value={customer.phone}
                  onChange={handleInput("phone")}
                  error={!!fieldErrors.phone}
                  helperText={fieldErrors.phone}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                />
                <TextField
                  label="Street"
                  fullWidth
                  value={customer.address.street}
                  onChange={handleInput("address.street")}
                  error={!!fieldErrors["address.street"]}
                  helperText={fieldErrors["address.street"]}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                  sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
                />
                <TextField
                  label="No."
                  fullWidth
                  value={customer.address.streetNo}
                  onChange={handleInput("address.streetNo")}
                  error={!!fieldErrors["address.streetNo"]}
                  helperText={fieldErrors["address.streetNo"]}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                />
                <TextField
                  label="PLZ"
                  fullWidth
                  value={customer.address.plz}
                  onChange={handleInput("address.plz")}
                  error={!!fieldErrors["address.plz"]}
                  helperText={fieldErrors["address.plz"]}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                />
                <TextField
                  label="City"
                  fullWidth
                  value={customer.address.city}
                  onChange={handleInput("address.city")}
                  error={!!fieldErrors["address.city"]}
                  helperText={fieldErrors["address.city"]}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.88)" } }}
                />
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button variant="outlined" onClick={() => navigate("/menu")}>
                  Back to Menu
                </Button>
                <Button
                  variant="contained"
                  onClick={preparePayment}
                  disabled={preparing}
                  sx={{
                    bgcolor: "#D4A017",
                    color: "#142B27",
                    "&:hover": { bgcolor: "#C59612" },
                    fontWeight: 700,
                  }}
                >
                  {preparing ? "Preparing…" : "Continue to payment"}
                </Button>
              </Box>
            </Paper>
          }
          right={<SummaryCard subtotal={subtotal} vat={vat} deliveryFee={deliveryFee} grand={grand} />}
        />
      </Box>
    );
  }

  // Step 2 — Payment (show summary on the right)
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Checkout
      </Typography>
      <Typography sx={{ opacity: 0.8, mb: 3 }}>Complete your payment securely.</Typography>

      <TwoCol
        left={
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentStep grandTotal={grand} />
          </Elements>
        }
        right={<SummaryCard subtotal={subtotal} vat={vat} deliveryFee={deliveryFee} grand={grand} />}
      />
    </Box>
  );
}