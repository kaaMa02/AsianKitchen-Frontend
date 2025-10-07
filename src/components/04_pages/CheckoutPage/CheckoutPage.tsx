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
  Paper,
  Divider,
} from "@mui/material";
import TextField from "@mui/material/TextField";

import { useCart } from "../../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import {
  type OrderType,
  type BuffetOrderWriteDTO,
  type CustomerOrderWriteDTO,
  type CustomerInfoDTO,
  PaymentMethod,
} from "../../../types/api-types";
import { createBuffetOrder } from "../../../services/buffetOrders";
import { createCustomerOrder } from "../../../services/customerOrders";
import {
  createIntentForBuffetOrder,
  createIntentForCustomerOrder,
} from "../../../services/payment";
import { stripePromise } from "../../../stripe";
import { ensureCsrf } from "../../../services/http";

/* ------------------------ small helpers ------------------------ */

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";
const CARD_BG = "#F4F7FB";

type Errors = Record<string, string>;

const emptyCustomer: CustomerInfoDTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

// delivery fee rule: > 25 & < 50 => 3; > 50 => 5; else 0
function calcDeliveryFee(orderType: OrderType, subtotal: number) {
  if (orderType !== "DELIVERY") return 0;
  if (subtotal > 50) return 5;
  if (subtotal > 25 && subtotal < 50) return 3;
  return 0;
}

function money(n: number) {
  return `CHF ${n.toFixed(2)}`;
}

/* ------------------------ payment step ------------------------ */

function PaymentStep({
  totalToPay,
  summary,
}: {
  totalToPay: number;
  summary: React.ReactNode;
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
    <Box
      sx={{
        display: "grid",
        gap: 3,
        gridTemplateColumns: { md: "1fr 420px" },
        alignItems: "start",
      }}
    >
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, border: "1px solid rgba(11,45,36,.12)" }}
      >
        <PaymentElement />
        <Button
          disabled={!stripe || submitting}
          variant="contained"
          onClick={onPay}
          fullWidth
          sx={{
            mt: 2,
            bgcolor: AK_GOLD,
            color: AK_DARK,
            fontWeight: 800,
            "&:hover": { bgcolor: "#E2B437" },
          }}
        >
          Pay {money(totalToPay)}
        </Button>
      </Paper>

      {summary}
    </Box>
  );
}

/* ------------------------ checkout page ------------------------ */

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total: cartTotalFromCtx } = useCart();

  // client preview amounts (server recomputes on PI create)
  const orderType: OrderType = state.orderType;
  const itemsSubtotal = Number.isFinite(cartTotalFromCtx) ? (cartTotalFromCtx as number) : 0;
  const vat = +(itemsSubtotal * 0.026).toFixed(2); // 2.6% VAT
  const deliveryFee = calcDeliveryFee(orderType, itemsSubtotal);
  const grand = +(itemsSubtotal + vat + deliveryFee).toFixed(2);
  const paymentMethod: PaymentMethod = PaymentMethod.CARD;

  // form state
  const [clientSecret, setClientSecret] = React.useState<string>();
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
      quantity: number;
    }>;
  }, [state]);

  // validation
  const validate = (c: CustomerInfoDTO): Errors => {
    const e: Errors = {};
    const req = (v?: string) => !v || !v.trim();

    if (req(c.firstName)) e.firstName = "Required";
    if (req(c.lastName)) e.lastName = "Required";
    if (req(c.email) || !/.+@.+\..+/.test(c.email))
      e.email = "Valid email required";
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

  // client PLZ gate (mirror backend)
  const allowedPlz = new Set([
    "4600", "4601", "4609", "4612", "4613", "4622", "4623", "4632",
  ]);
  const canDeliver =
    orderType !== "DELIVERY" ||
    (customer.address.plz && allowedPlz.has(customer.address.plz.trim()));

  // create order + PI
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

      if (!canDeliver) {
        setError("We currently don’t deliver to this address.");
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
          items: cartLines.map((l) => ({
            menuItemId: l.id,
            quantity: l.quantity,
          })),
          paymentMethod,
        };
        const order = await createCustomerOrder(payload);
        const pi = await createIntentForCustomerOrder(order.id);
        setClientSecret(pi.clientSecret);
      } else {
        const payload: BuffetOrderWriteDTO = {
          userId: undefined,
          customerInfo: customer,
          orderType,
          specialInstructions: undefined,
          items: cartLines.map((l) => ({
            buffetItemId: l.id,
            quantity: l.quantity,
          })),
          paymentMethod,
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

  // Order summary (reused on both steps)
  const OrderSummary = (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: "1px solid rgba(11,45,36,.12)",
        color: AK_DARK,
        bgcolor: "#FFFFFF",
        minWidth: 320,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, color: AK_DARK, mb: 1 }}>
        Order summary
      </Typography>

      <Box sx={{ display: "grid", gap: 1.25 }}>
        <Row label="Subtotal" value={money(itemsSubtotal)} />
        <Row label="VAT (2.6%)" value={money(vat)} />
        <Row label="Delivery fee" value={money(deliveryFee)} />

        <Divider sx={{ my: 1 }} />

        <Row label={<strong>Total</strong>} value={<strong>{money(grand)}</strong>} />
      </Box>
    </Paper>
  );

  // Step 1: Details
  if (!clientSecret) {
    return (
      <Box sx={{ p: 3, maxWidth: 1080, mx: "auto" }}>
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { md: "1fr 420px" },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid rgba(11,45,36,.12)",
              bgcolor: CARD_BG,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: AK_DARK }}>
              Your details
            </Typography>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              }}
            >
              <TextField label="First name" fullWidth value={customer.firstName}
                onChange={handleInput("firstName")} error={!!fieldErrors.firstName}
                helperText={fieldErrors.firstName} />
              <TextField label="Last name" fullWidth value={customer.lastName}
                onChange={handleInput("lastName")} error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName} />
              <TextField label="Email" type="email" fullWidth value={customer.email}
                onChange={handleInput("email")} error={!!fieldErrors.email}
                helperText={fieldErrors.email} />
              <TextField label="Phone" fullWidth value={customer.phone}
                onChange={handleInput("phone")} error={!!fieldErrors.phone}
                helperText={fieldErrors.phone} />
              <TextField label="Street" fullWidth value={customer.address.street}
                onChange={handleInput("address.street")} error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]} sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }} />
              <TextField label="No." fullWidth value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")} error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]} />
              <TextField label="PLZ" fullWidth value={customer.address.plz}
                onChange={handleInput("address.plz")} error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]} />
              <TextField label="City" fullWidth value={customer.address.city}
                onChange={handleInput("address.city")} error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]} />
            </Box>

            {orderType === "DELIVERY" && !canDeliver && (
              <Alert severity="error" sx={{ mt: 2 }}>
                We currently don’t deliver to this address.
              </Alert>
            )}

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
                disabled={preparing || (orderType === "DELIVERY" && !canDeliver)}
                sx={{
                  bgcolor: AK_GOLD,
                  color: AK_DARK,
                  fontWeight: 800,
                  "&:hover": { bgcolor: "#E2B437" },
                }}
              >
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Box>
          </Paper>

          {OrderSummary}
        </Box>
      </Box>
    );
  }

  // Step 2: Payment
  return (
    <Box sx={{ p: 3, maxWidth: 1080, mx: "auto" }}>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentStep totalToPay={grand} summary={OrderSummary} />
      </Elements>
    </Box>
  );
}

/* ------------------------ tiny UI helper ------------------------ */

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography component="span" sx={{ color: "#0B2D24" }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ color: "#0B2D24" }}>
        {value}
      </Typography>
    </Box>
  );
}