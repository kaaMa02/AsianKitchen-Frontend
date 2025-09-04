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
  Paper,
  Divider,
  Chip,
  Stack,
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

/* ---- Theme helpers to match your site ---- */
const COLORS = {
  bg: "#081f19",
  card: "rgba(255,255,255,0.04)",
  stroke: "rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.92)",
  sub: "rgba(255,255,255,0.72)",
  muted: "rgba(255,255,255,0.55)",
  accent: "#F6C343",
};

// Reusable styling for all TextFields on this page
const TF_PROPS = {
  InputLabelProps: {
    sx: {
      color: "rgba(255,255,255,0.85)", // lighter label
      "&.Mui-focused": { color: COLORS.accent }, // gold on focus
    },
  },
  InputProps: {
    sx: {
      color: COLORS.text,
      background: "rgba(255,255,255,0.02)",
      "& .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.stroke },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.sub },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: COLORS.accent,
      },
    },
  },
  FormHelperTextProps: { sx: { color: "#ffb4b4" } }, // clearer error text
} as const;

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
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        bgcolor: COLORS.card,
        border: `1px solid ${COLORS.stroke}`,
        borderRadius: 3,
      }}
    >
      <Typography sx={{ fontWeight: 800, mb: 1.5, color: COLORS.text }}>
        Payment
      </Typography>

      <Box sx={{ mb: 2, color: COLORS.muted }}>
        Enter your card details below to complete the order.
      </Box>

      <Box sx={{ mb: 2 }}>
        <PaymentElement />
      </Box>

      <Button
        fullWidth
        size="large"
        disabled={!stripe || submitting}
        variant="contained"
        onClick={onPay}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          bgcolor: COLORS.accent,
          color: "#0B2D24",
          "&:hover": { bgcolor: "#eab833" },
          borderRadius: 2,
          py: 1.25,
        }}
      >
        Pay CHF {total.toFixed(2)}
      </Button>
    </Paper>
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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total } = useCart();

  // 1) local state
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] =
    React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // 2) normalize cart lines
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      key?: string;
      name?: string;
      priceChf?: number;
      kind: "MENU" | "BUFFET";
      id: string;
      quantity: number;
    }>;
  }, [state]);

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

      if (!cartLines.length) {
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

  /* ---------------------------- RENDER ---------------------------- */

  // Step 2: Payment
  if (clientSecret) {
    return (
      <Box
        sx={{ bgcolor: COLORS.bg, minHeight: "100vh", py: { xs: 2, md: 4 } }}
      >
        <Box sx={{ maxWidth: 1040, mx: "auto", px: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label="1. Details"
              variant="outlined"
              sx={{ color: COLORS.muted, borderColor: COLORS.stroke }}
            />
            <Chip
              label="2. Payment"
              sx={{ bgcolor: COLORS.accent, color: "#0B2D24", fontWeight: 700 }}
            />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { md: "1.1fr .9fr", xs: "1fr" },
              gap: 2.5,
            }}
          >
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: "night" } }}
            >
              <PaymentStep />
            </Elements>
            <OrderSummary />
          </Box>
        </Box>
      </Box>
    );
  }

  // Step 1: Details
  return (
    <Box sx={{ bgcolor: COLORS.bg, minHeight: "100vh", py: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1040, mx: "auto", px: 2 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 900, color: COLORS.text, mb: 0.5 }}
        >
          Checkout
        </Typography>
        <Typography sx={{ color: COLORS.sub, mb: 2 }}>
          Please provide your contact and address details.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            label="1. Details"
            sx={{ bgcolor: COLORS.accent, color: "#0B2D24", fontWeight: 700 }}
          />
          <Chip
            label="2. Payment"
            variant="outlined"
            sx={{ color: COLORS.muted, borderColor: COLORS.stroke }}
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { md: "1.1fr .9fr", xs: "1fr" },
            gap: 2.5,
          }}
        >
          {/* Left: Form */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              bgcolor: COLORS.card,
              border: `1px solid ${COLORS.stroke}`,
              borderRadius: 3,
            }}
          >
            <Typography sx={{ fontWeight: 800, mb: 1.5, color: COLORS.text }}>
              Your details
            </Typography>

            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                void preparePayment();
              }}
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              }}
            >
              <TextField
                {...TF_PROPS}
                label="First name"
                value={customer.firstName}
                onChange={handleInput("firstName")}
                error={!!fieldErrors.firstName}
                helperText={fieldErrors.firstName}
              />

              <TextField
                {...TF_PROPS}
                label="Last name"
                value={customer.lastName}
                onChange={handleInput("lastName")}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
              />

              <TextField
                {...TF_PROPS}
                label="Email"
                type="email"
                value={customer.email}
                onChange={handleInput("email")}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
              />

              <TextField
                {...TF_PROPS}
                label="Phone"
                value={customer.phone}
                onChange={handleInput("phone")}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
              />

              <TextField
                {...TF_PROPS}
                label="Street"
                value={customer.address.street}
                onChange={handleInput("address.street")}
                error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]}
                sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
              />

              <TextField
                {...TF_PROPS}
                label="No."
                value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")}
                error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]}
              />

              <TextField
                {...TF_PROPS}
                label="PLZ"
                value={customer.address.plz}
                onChange={handleInput("address.plz")}
                error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]}
              />

              <TextField
                {...TF_PROPS}
                label="City"
                value={customer.address.city}
                onChange={handleInput("address.city")}
                error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/menu")}
                sx={{
                  color: COLORS.text,
                  borderColor: COLORS.stroke,
                  "&:hover": { borderColor: COLORS.sub },
                }}
              >
                Back to Menu
              </Button>
              <Button
                variant="contained"
                onClick={preparePayment}
                disabled={preparing}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: COLORS.accent,
                  color: "#0B2D24",
                  "&:hover": { bgcolor: "#eab833" },
                }}
              >
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Stack>
          </Paper>

          {/* Right: Order summary */}
          <OrderSummary />
        </Box>
      </Box>
    </Box>
  );
}

/* --------- Right column: summary card --------- */
function OrderSummary() {
  const { state, total } = useCart();
  const lines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      key?: string;
      name?: string;
      priceChf?: number;
      quantity: number;
    }>;
  }, [state]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        bgcolor: COLORS.card,
        border: `1px solid ${COLORS.stroke}`,
        borderRadius: 3,
        position: { md: "sticky" },
        top: { md: 24 },
        alignSelf: "start",
      }}
    >
      <Typography sx={{ fontWeight: 800, mb: 1.5, color: COLORS.text }}>
        Order summary
      </Typography>

      {lines.length === 0 ? (
        <Typography sx={{ color: COLORS.muted }}>
          Your cart is empty.
        </Typography>
      ) : (
        <>
          <Stack
            divider={<Divider sx={{ borderColor: COLORS.stroke }} />}
            spacing={1}
          >
            {lines.map((l, i) => (
              <Box
                key={l.key ?? i}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{ color: COLORS.text, fontWeight: 600 }}
                    noWrap
                  >
                    {l.name ?? "Item"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: COLORS.muted }}>
                    × {l.quantity}
                  </Typography>
                </Box>
                <Typography sx={{ color: COLORS.text, fontWeight: 700 }}>
                  CHF {(l.priceChf ? l.priceChf * l.quantity : 0).toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 2, borderColor: COLORS.stroke }} />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: COLORS.sub, fontWeight: 700 }}>
              Total
            </Typography>
            <Typography sx={{ color: COLORS.text, fontWeight: 900 }}>
              CHF {total.toFixed(2)}
            </Typography>
          </Box>

          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: COLORS.muted }}
          >
            Taxes are calculated on the payment step.
          </Typography>
        </>
      )}
    </Paper>
  );
}
