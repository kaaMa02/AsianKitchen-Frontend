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
  ToggleButton,
  ToggleButtonGroup,
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

// --- helpers ---
const VAT_RATE = 0.026;

type Errors = Record<string, string>;

const emptyCustomer: CustomerInfoDTO = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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
    <Box sx={{ maxWidth: 520, mx: "auto", display: "grid", gap: 2 }}>
      <PaymentElement />
      <Button
        disabled={!stripe || submitting}
        variant="contained"
        onClick={onPay}
        sx={{
          bgcolor: "#C9A227",
          color: "#0B2D24",
          fontWeight: 700,
          "&:hover": { bgcolor: "#B8941F" },
        }}
      >
        Pay CHF {total.toFixed(2)}
      </Button>
    </Box>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, setOrderType } = useCart();

  // ── local state
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);
  const [customer, setCustomer] =
    React.useState<CustomerInfoDTO>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});

  // normalize lines & compute prices for the summary
  const lines = React.useMemo(() => {
    const anyState = state as any;
    const raw = (anyState.lines ?? anyState.items ?? []) as Array<any>;
    return raw.map((l) => ({
      kind: (l.kind as "MENU" | "BUFFET") ?? "MENU",
      id: String(l.id ?? l.menuItemId ?? l.buffetItemId ?? ""),
      quantity: Number(l.quantity ?? 1),
      unitPrice:
        typeof l.priceChf !== "undefined"
          ? Number(l.priceChf)
          : typeof l.price !== "undefined"
          ? Number(l.price)
          : 0,
      name: l.name ?? "",
      key: l.key ?? `${l.id ?? l.menuItemId ?? l.buffetItemId}`,
    }));
  }, [state]);

  const orderType: OrderType = state.orderType;

  const summary = React.useMemo(() => {
    const subtotal = round2(
      lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
    );

    const vat = round2(subtotal * VAT_RATE);

    let deliveryFee = 0;
    if (orderType === "DELIVERY") {
      if (subtotal > 25 && subtotal < 50) deliveryFee = 3;
      else if (subtotal > 50) deliveryFee = 5;
    }

    const total = round2(subtotal + vat + deliveryFee);

    return { subtotal, vat, deliveryFee, total };
  }, [lines, orderType]);

  // validation
  const validate = (c: CustomerInfoDTO): Errors => {
    const e: Errors = {};
    const req = (v?: string) => !v || !v.trim();

    if (req(c.firstName)) e.firstName = "Required";
    if (req(c.lastName)) e.lastName = "Required";
    if (req(c.email) || !/.+@.+\..+/.test(c.email))
      e.email = "Valid email required";
    if (req(c.phone)) e.phone = "Required";

    // Address required for both types (owner’s request)
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

  const preparePayment = async () => {
    try {
      setError(undefined);
      setFieldErrors({});

      if (!lines.length) {
        setError("Your cart is empty.");
        return;
      }

      const hasMenu = lines.some((l) => l.kind === "MENU");
      const hasBuffet = lines.some((l) => l.kind === "BUFFET");
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
          specialInstructions: undefined,
          items: lines.map((l) => ({
            menuItemId: l.id,
            quantity: l.quantity,
          })),
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
          items: lines.map((l) => ({
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

  // ── render
  if (!clientSecret) {
    return (
      <Box sx={{ p: 3, maxWidth: 980, mx: "auto", display: "grid", gap: 2 }}>
        {/* order type toggle */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0B2D24" }}>
            Checkout
          </Typography>
          <ToggleButtonGroup
            value={orderType}
            exclusive
            onChange={(_, v: OrderType | null) => v && setOrderType(v)}
            size="small"
          >
            <ToggleButton value={OrderType.TAKEAWAY}>Takeaway</ToggleButton>
            <ToggleButton value={OrderType.DELIVERY}>Delivery</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 360px" },
            alignItems: "start",
          }}
        >
          {/* left: details */}
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb" }}>
            <Typography
              variant="subtitle1"
              sx={{ mb: 1.5, fontWeight: 700, color: "#0B2D24" }}
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
                InputLabelProps={{ sx: { color: "text.secondary" } }}
              />
              <TextField
                label="Last name"
                fullWidth
                value={customer.lastName}
                onChange={handleInput("lastName")}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
                InputLabelProps={{ sx: { color: "text.secondary" } }}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={customer.email}
                onChange={handleInput("email")}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                InputLabelProps={{ sx: { color: "text.secondary" } }}
              />
              <TextField
                label="Phone"
                fullWidth
                value={customer.phone}
                onChange={handleInput("phone")}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
                InputLabelProps={{ sx: { color: "text.secondary" } }}
              />
              <TextField
                label="Street"
                fullWidth
                value={customer.address.street}
                onChange={handleInput("address.street")}
                error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]}
                InputLabelProps={{ sx: { color: "text.secondary" } }}
                sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
              />
              <TextField
                label="No."
                fullWidth
                value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")}
                error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]}
                InputLabelProps={{ sx: { color: "text.secondary" } }}
              />
              <TextField
                label="PLZ"
                fullWidth
                value={customer.address.plz}
                onChange={handleInput("address.plz")}
                error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]}
                InputLabelProps={{ sx: { color: "text.secondary" } }}
              />
              <TextField
                label="City"
                fullWidth
                value={customer.address.city}
                onChange={handleInput("address.city")}
                error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]}
                InputLabelProps={{ sx: { color: "text.secondary" } }}
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
                sx={{
                  bgcolor: "#C9A227",
                  color: "#0B2D24",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#B8941F" },
                }}
              >
                {preparing ? "Preparing…" : "Continue to payment"}
              </Button>
            </Box>
          </Paper>

          {/* right: summary */}
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb" }}>
            <Typography
              variant="subtitle1"
              sx={{ mb: 1.5, fontWeight: 700, color: "#0B2D24" }}
            >
              Order summary
            </Typography>

            <Box sx={{ display: "grid", gap: 1 }}>
              <Row label="Subtotal" value={`CHF ${summary.subtotal.toFixed(2)}`} />
              <Row label={`VAT (2.6%)`} value={`CHF ${summary.vat.toFixed(2)}`} />
              <Row
                label="Delivery fee"
                value={
                  orderType === "DELIVERY"
                    ? `CHF ${summary.deliveryFee.toFixed(2)}`
                    : "—"
                }
              />
              <Divider sx={{ my: 1 }} />
              <Row
                label={<strong>Total</strong>}
                value={<strong>{`CHF ${summary.total.toFixed(2)}`}</strong>}
              />
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  // payment step
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentStep />
    </Elements>
  );
}

// small helper for summary rows
function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#0B2D24" }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <span>{value}</span>
    </Box>
  );
}
