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
  Chip,
  Divider,
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers: currency + safe numeric conversion                                */
/* ────────────────────────────────────────────────────────────────────────── */

const formatChf = (v: number) =>
  new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  // handle "12,00", "CHF 12.00", etc.
  const n = Number(String(v).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/* Reusable field styling: lighten labels on dark background */
const fieldSx = {
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.92)" },
  "& .MuiOutlinedInput-input": { color: "rgba(255,255,255,0.98)" },
  "& .MuiFormHelperText-root": { color: "#ffb4a2" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.22)" },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255,255,255,0.38)",
  },
} as const;

/* Card-like container */
const cardSx = {
  p: 3,
  borderRadius: 3,
  bgcolor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
} as const;

/* ────────────────────────────────────────────────────────────────────────── */
/* Payment step (left card)                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function PaymentStep() {
  const stripe = useStripe();
  const elements = useElements();
  const { total } = useCart();
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
    <Box sx={cardSx}>
      <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Payment</Typography>
      <Typography sx={{ opacity: 0.85, mb: 2 }}>
        Enter your card details below to complete the order.
      </Typography>

      <Box sx={{ display: "grid", gap: 2, maxWidth: 520 }}>
        <PaymentElement />
        <Button
          disabled={!stripe || submitting}
          variant="contained"
          onClick={onPay}
          sx={{ height: 44, fontWeight: 800 }}
        >
          Pay {formatChf(total)}
        </Button>
      </Box>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page component                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

type Errors = Record<string, string>;

const emptyCustomer: CustomerInfoDTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state } = useCart();

  // 1) local state
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] =
    React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // 2) normalize cart lines (supports a couple internal shapes)
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      key?: string;
      id: string;
      name?: string;
      title?: string;
      label?: string;
      priceChf?: number | string;
      price?: number | string;
      unitPrice?: number | string;
      quantity: number;
      kind: "MENU" | "BUFFET";
    }>;
  }, [state]);

  // Build a clean summary structure (handles string prices safely)
  const summaryLines = React.useMemo(() => {
    return cartLines.map((l) => {
      const unit = toNumber(l.priceChf ?? l.price ?? l.unitPrice);
      const qty = Number(l.quantity ?? 1);
      return {
        key: l.key ?? l.id,
        name: l.name ?? l.title ?? l.label ?? "Item",
        qty,
        unit,
        lineTotal: unit * qty,
      };
    });
  }, [cartLines]);

  const summaryTotal = React.useMemo(
    () => summaryLines.reduce((s, ln) => s + ln.lineTotal, 0),
    [summaryLines]
  );

  // 3) validation matching backend (NotBlank on all these)
  const validate = (c: CustomerInfoDTO): Errors => {
    const e: Errors = {};
    const req = (v?: string) => !v || !v.trim();

    if (req(c.firstName)) e.firstName = "Required";
    if (req(c.lastName)) e.lastName = "Required";
    if (req(c.email) || !/.+@.+\..+/.test(c.email))
      e.email = "Valid email required";
    if (req(c.phone)) e.phone = "Required";

    // Backend currently requires address for orders (delivery & takeaway)
    if (req(c.address.street)) e["address.street"] = "Required";
    if (req(c.address.streetNo)) e["address.streetNo"] = "Required";
    if (req(c.address.plz)) e["address.plz"] = "Required";
    if (req(c.address.city)) e["address.city"] = "Required";

    return e;
  };

  // helper to map backend validation response to field errors if needed
  const applyBackendErrors = (details: Record<string, string>) => {
    const mapped: Errors = {};
    Object.entries(details).forEach(([k, v]) => {
      // BE keys look like: "customerInfo.address.plz"
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

  // 4) create order + PI after collecting details
  const preparePayment = async () => {
    try {
      setError(undefined);
      setFieldErrors({});

      if (!summaryLines.length) {
        setError("Your cart is empty.");
        return;
      }

      const hasMenu = cartLines.some((l) => l.kind === "MENU");
      const hasBuffet = cartLines.some((l) => l.kind === "BUFFET");
      if (hasMenu && hasBuffet) {
        setError(
          "Mixed cart (menu + buffet) is not supported yet. Please order them separately."
        );
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
          items: cartLines.map((l) => ({
            menuItemId: l.id,
            quantity: l.quantity,
          })),
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
          items: cartLines.map((l) => ({
            buffetItemId: l.id,
            quantity: l.quantity,
          })),
        };
        const order = await createBuffetOrder(payload);
        const pi = await createIntentForBuffetOrder(order.id);
        setClientSecret(pi.clientSecret);
      }
    } catch (e: any) {
      console.error(e);
      const details = e?.response?.data?.details as
        | Record<string, string>
        | undefined;
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

  /* ──────────────────────────────────────────────────────────────────────── */
  /* RENDER                                                                  */
  /* ──────────────────────────────────────────────────────────────────────── */

  // Right column: order summary card (used on both steps)
  const OrderSummary = (
    <Box sx={cardSx}>
      <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Order summary</Typography>

      {summaryLines.map((ln) => (
        <Box
          key={ln.key}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1.25,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              {ln.name}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              × {ln.qty}
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 800 }}>{formatChf(ln.lineTotal)}</Typography>
        </Box>
      ))}

      <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1.5 }}>
        <Typography sx={{ fontWeight: 800 }}>Total</Typography>
        <Typography sx={{ fontWeight: 800 }}>{formatChf(summaryTotal)}</Typography>
      </Box>

      <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mt: 1 }}>
        Taxes are calculated on the payment step.
      </Typography>
    </Box>
  );

  // Step header
  const StepHeader = (active: "details" | "payment") => (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
      <Chip
        label="1. Details"
        color={active === "details" ? "warning" : "default"}
        variant={active === "details" ? "filled" : "outlined"}
        sx={{ fontWeight: 700 }}
      />
      <Chip
        label="2. Payment"
        color={active === "payment" ? "warning" : "default"}
        variant={active === "payment" ? "filled" : "outlined"}
        sx={{ fontWeight: 700 }}
      />
    </Box>
  );

  if (!clientSecret) {
    return (
      <Box sx={{ px: 3, py: 4, maxWidth: 1100, mx: "auto" }}>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.75 }}>
          Checkout
        </Typography>
        <Typography sx={{ opacity: 0.9, mb: 2 }}>
          Please provide your contact and address details.
        </Typography>

        {StepHeader("details")}

        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            alignItems: "start",
          }}
        >
          {/* Left: Details card */}
          <Box sx={cardSx}>
            <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
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
                sx={fieldSx}
              />
              <TextField
                label="Last name"
                fullWidth
                value={customer.lastName}
                onChange={handleInput("lastName")}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
                sx={fieldSx}
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                value={customer.email}
                onChange={handleInput("email")}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                sx={fieldSx}
              />
              <TextField
                label="Phone"
                fullWidth
                value={customer.phone}
                onChange={handleInput("phone")}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
                sx={fieldSx}
              />

              <TextField
                label="Street"
                fullWidth
                value={customer.address.street}
                onChange={handleInput("address.street")}
                error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]}
                sx={{ ...fieldSx, gridColumn: { xs: "1 / -1", md: "auto" } }}
              />
              <TextField
                label="No."
                fullWidth
                value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")}
                error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]}
                sx={fieldSx}
              />

              <TextField
                label="PLZ"
                fullWidth
                value={customer.address.plz}
                onChange={handleInput("address.plz")}
                error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]}
                sx={fieldSx}
              />
              <TextField
                label="City"
                fullWidth
                value={customer.address.city}
                onChange={handleInput("address.city")}
                error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]}
                sx={fieldSx}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={() => navigate("/menu")}>
                Back to Menu
              </Button>
              <Button
                variant="contained"
                onClick={preparePayment}
                disabled={preparing}
              >
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Box>
          </Box>

          {/* Right: Summary card */}
          {OrderSummary}
        </Box>
      </Box>
    );
  }

  // Step 2: Payment (Stripe Elements) + order summary
  return (
    <Box sx={{ px: 3, py: 4, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.75 }}>
        Checkout
      </Typography>
      <Typography sx={{ opacity: 0.9, mb: 2 }}>
        Complete your payment securely.
      </Typography>

      {StepHeader("payment")}

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          alignItems: "start",
        }}
      >
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentStep />
        </Elements>

        {OrderSummary}
      </Box>
    </Box>
  );
}
