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
} from "@mui/material";

import { useCart } from "../../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import {
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

const fmtChf = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(
    n
  );

const calcDeliveryFee = (orderType: OrderType, subtotal: number): number => {
  if (orderType !== OrderType.DELIVERY) return 0;
  if (subtotal > 50) return 5;
  if (subtotal > 25 && subtotal < 50) return 3;
  return 0;
};

// Make labels lighter (to match your design)
const lightLabelSx = { color: "rgba(11,45,36,0.6)" };

// Gold button style (like before)
const goldBtnSx = {
  bgcolor: "#C8A44B",
  color: "#0B2D24",
  fontWeight: 700,
  "&:hover": { bgcolor: "#b8953e" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment step (renders Stripe Payment Element)

function PaymentStep({ totalDue }: { totalDue: number }) {
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
    <Box sx={{ maxWidth: 520, mx: "auto", display: "grid", gap: 2 }}>
      <PaymentElement />
      <Button
        disabled={!stripe || submitting}
        variant="contained"
        onClick={onPay}
        sx={goldBtnSx}
      >
        Pay {fmtChf(totalDue)}
      </Button>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page

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
  const { state, total } = useCart(); // `total` is your cart subtotal (items)

  // Local state
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] =
    React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // Normalize cart lines
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      kind: "MENU" | "BUFFET";
      id: string;
      quantity: number;
    }>;
  }, [state]);

  // Delivery fee & totals
  const orderType: OrderType = state.orderType;
  const subtotal = Number(total ?? 0);
  const deliveryFee = calcDeliveryFee(orderType, subtotal);
  const totalDue = subtotal + deliveryFee;

  // Validation (matches backend @NotBlank etc.)
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

  // Map backend validation errors to fields
  const applyBackendErrors = (details: Record<string, string>) => {
    const mapped: Errors = {};
    Object.entries(details).forEach(([k, v]) => {
      const short = k.replace(/^customerInfo\./, ""); // e.g. "customerInfo.address.plz" -> "address.plz"
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

  // Create order + PI after collecting details
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

      if (hasMenu) {
        const payload: CustomerOrderWriteDTO = {
          userId: undefined,
          customerInfo: customer,
          orderType,
          // NOTE: backend currently doesn't store a delivery fee field.
          // You can temporarily drop the fee note in specialInstructions:
          specialInstructions:
            deliveryFee > 0
              ? `Delivery fee to apply: ${deliveryFee.toFixed(2)} CHF`
              : undefined,
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
          specialInstructions:
            deliveryFee > 0
              ? `Delivery fee to apply: ${deliveryFee.toFixed(2)} CHF`
              : undefined,
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

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER

  if (!clientSecret) {
    return (
      <Box sx={{ p: 3, maxWidth: 980, mx: "auto", display: "grid", gap: 3 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, color: "#0B2D24", letterSpacing: 0.2 }}
        >
          Checkout
        </Typography>

        {/* Layout: details (left) + summary (right) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 360px" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* Details card */}
          <Paper elevation={1} sx={{ p: 2.5 }}>
            <Typography
              variant="h6"
              sx={{ mb: 1.5, fontWeight: 800, color: "#0B2D24" }}
            >
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
                InputLabelProps={{ sx: lightLabelSx }}
              />

              <TextField
                label="Last name"
                fullWidth
                value={customer.lastName}
                onChange={handleInput("lastName")}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
                InputLabelProps={{ sx: lightLabelSx }}
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                value={customer.email}
                onChange={handleInput("email")}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                InputLabelProps={{ sx: lightLabelSx }}
              />

              <TextField
                label="Phone"
                fullWidth
                value={customer.phone}
                onChange={handleInput("phone")}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
                InputLabelProps={{ sx: lightLabelSx }}
              />

              <TextField
                label="Street"
                fullWidth
                value={customer.address.street}
                onChange={handleInput("address.street")}
                error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]}
                InputLabelProps={{ sx: lightLabelSx }}
                sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
              />

              <TextField
                label="No."
                fullWidth
                value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")}
                error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]}
                InputLabelProps={{ sx: lightLabelSx }}
              />

              <TextField
                label="PLZ"
                fullWidth
                value={customer.address.plz}
                onChange={handleInput("address.plz")}
                error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]}
                InputLabelProps={{ sx: lightLabelSx }}
              />

              <TextField
                label="City"
                fullWidth
                value={customer.address.city}
                onChange={handleInput("address.city")}
                error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]}
                InputLabelProps={{ sx: lightLabelSx }}
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
                sx={goldBtnSx}
              >
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Box>
          </Paper>

          {/* Order summary */}
          <Paper elevation={1} sx={{ p: 2.5 }}>
            <Typography
              variant="h6"
              sx={{ mb: 1.5, fontWeight: 800, color: "#0B2D24" }}
            >
              Order summary
            </Typography>

            <Box sx={{ display: "grid", gap: 1 }}>
              <Row label="Subtotal" value={fmtChf(subtotal)} />
              {orderType === OrderType.DELIVERY && (
                <Row
                  label="Delivery fee"
                  value={fmtChf(deliveryFee)}
                  faded={deliveryFee === 0}
                />
              )}
              <Divider sx={{ my: 1 }} />
              <Row
                label="Total due"
                value={fmtChf(totalDue)}
                strong
                large
              />
            </Box>

            <Typography sx={{ mt: 1.5, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
              * Delivery fee applies only to delivery orders. Your card will be
              charged the amount shown on the payment step.
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  // Payment step
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <Box sx={{ p: 3, maxWidth: 720, mx: "auto", display: "grid", gap: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, color: "#0B2D24" }}
        >
          Payment
        </Typography>
        <PaymentStep totalDue={totalDue} />
      </Box>
    </Elements>
  );
}

// Small row component for summary
function Row({
  label,
  value,
  strong,
  large,
  faded,
}: {
  label: string;
  value: string;
  strong?: boolean;
  large?: boolean;
  faded?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        color: faded ? "rgba(0,0,0,0.5)" : "#0B2D24",
        fontWeight: strong ? 800 : 600,
        fontSize: large ? 18 : 14,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </Box>
  );
}
