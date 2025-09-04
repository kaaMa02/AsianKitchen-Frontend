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
  TextField,
  Divider,
  Chip,
} from "@mui/material";

import { useCart } from "../../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import type {
  OrderType,
  BuffetOrderWriteDTO,
  CustomerOrderWriteDTO,
  CustomerInfoDTO,
  PaymentIntentResponseDTO,
} from "../../../types/api-types";
import { createBuffetOrder } from "../../../services/buffetOrders";
import { createCustomerOrder } from "../../../services/customerOrders";
import {
  createIntentForBuffetOrder,
  createIntentForCustomerOrder,
} from "../../../services/payment";
import { stripePromise } from "../../../stripe";
import { ensureCsrf } from "../../../services/http";

// ────────────────────────────────────────────────────────────────────────────

function fmtChfFromRappen(r?: number) {
  return r == null ? "—" : `CHF ${(r / 100).toFixed(2)}`;
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography sx={{ color: muted ? "rgba(231,246,241,.75)" : "#e7f6f1" }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: bold ? 800 : 600, color: "#e7f6f1" }}>
        {value}
      </Typography>
    </Box>
  );
}

function PaymentStep({ payLabel }: { payLabel: string }) {
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
      <Button disabled={!stripe || submitting} variant="contained" onClick={onPay}>
        {payLabel}
      </Button>
    </Box>
  );
}

type Errors = Record<string, string>;

const emptyCustomer: CustomerInfoDTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

// ────────────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state } = useCart();

  const [clientSecret, setClientSecret] = React.useState<string>();
  const [amounts, setAmounts] =
    React.useState<PaymentIntentResponseDTO["amounts"] | null>(null);
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] =
    React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // normalize cart lines
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      kind: "MENU" | "BUFFET";
      id: string;
      name?: string;
      quantity: number;
      priceChf?: number;
    }>;
  }, [state]);

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

  // Create order + PaymentIntent (with VAT-inclusive calculation from backend)
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
        setAmounts(pi.amounts ?? null);
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
        setAmounts(pi.amounts ?? null);
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

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER

  // Header
  const Header = (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, color: "#e7f6f1" }}>
        Checkout
      </Typography>
      <Typography sx={{ opacity: 0.8 }}>
        {clientSecret ? "Complete your payment securely." : "Please provide your contact and address details."}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        <Chip label="1. Details" color={clientSecret ? "default" : "primary"} variant="filled" />
        <Chip label="2. Payment" color={clientSecret ? "primary" : "default"} variant="filled" />
      </Box>
    </Box>
  );

  // Left card style
  const cardSx = {
    background: "#112b25",
    borderRadius: 3,
    p: 3,
    color: "#e7f6f1",
    boxShadow: "0 2px 0 rgba(0,0,0,.12), inset 0 0 0 1px rgba(255,255,255,.06)",
  };

  if (!clientSecret) {
    return (
      <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
        {Header}

        <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 3 }}>
          {/* Details card */}
          <Box sx={cardSx}>
            <Typography sx={{ fontWeight: 800, mb: 1, color: "#e7f6f1" }}>
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
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
              />
              <TextField
                label="Last name"
                fullWidth
                value={customer.lastName}
                onChange={handleInput("lastName")}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={customer.email}
                onChange={handleInput("email")}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
              />
              <TextField
                label="Phone"
                fullWidth
                value={customer.phone}
                onChange={handleInput("phone")}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
              />
              <TextField
                label="Street"
                fullWidth
                value={customer.address.street}
                onChange={handleInput("address.street")}
                error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]}
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
                sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
              />
              <TextField
                label="No."
                fullWidth
                value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")}
                error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]}
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
              />
              <TextField
                label="PLZ"
                fullWidth
                value={customer.address.plz}
                onChange={handleInput("address.plz")}
                error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]}
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
              />
              <TextField
                label="City"
                fullWidth
                value={customer.address.city}
                onChange={handleInput("address.city")}
                error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]}
                InputLabelProps={{ sx: { color: "rgba(231,246,241,.85)" } }}
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
              <Button variant="contained" onClick={preparePayment} disabled={preparing}>
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Box>
          </Box>

          {/* Order summary */}
          <Box sx={cardSx}>
            <Typography sx={{ fontWeight: 800, mb: 1.5, color: "#e7f6f1" }}>
              Order summary
            </Typography>

            <Box sx={{ display: "grid", gap: 1.25 }}>
              {cartLines.map((l) => (
                <Box key={l.id}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: 700 }}>{l.name ?? "Item"}</Typography>
                    {/* If you want to show line totals, add them here from your cart state */}
                  </Box>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    × {l.quantity}
                  </Typography>
                  <Divider sx={{ mt: 1.25, opacity: 0.1 }} />
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Taxes are calculated on the payment step.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Payment step
  const payLabel = `Pay ${fmtChfFromRappen(amounts?.total)}`;

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      {Header}

      <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 3 }}>
        {/* Payment card */}
        <Box sx={cardSx}>
          <Typography sx={{ fontWeight: 800, mb: 1, color: "#e7f6f1" }}>
            Payment
          </Typography>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentStep payLabel={payLabel} />
          </Elements>
        </Box>

        {/* Summary with VAT line (included) */}
        <Box sx={cardSx}>
          <Typography sx={{ fontWeight: 800, mb: 1.5, color: "#e7f6f1" }}>
            Order summary
          </Typography>

          <Box sx={{ display: "grid", gap: 1.25 }}>
            {/* Optional: <Row label="Subtotal" value={fmtChfFromRappen(amounts?.net)} /> */}
            <Row
              label={`VAT${amounts?.vatRatePct != null ? ` (${amounts.vatRatePct.toFixed(2)}% included)` : " (included)"}`}
              value={fmtChfFromRappen(amounts?.tax)}
              muted
            />
            <Divider sx={{ my: 1, opacity: 0.12 }} />
            <Row label="Total" value={fmtChfFromRappen(amounts?.total)} bold />
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Prices include VAT. Taxes shown here are included in the total.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
