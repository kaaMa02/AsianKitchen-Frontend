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
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../../contexts/CartContext";
import {
  OrderType,
  PaymentMethod as PaymentMethodType,
  BuffetOrderWriteDTO,
  CustomerOrderWriteDTO,
} from "../../../types/api-types";
import { PaymentMethod } from "../../../types/api-types";

import {
  getActiveDiscount,
  type ActiveDiscountDTO,
} from "../../../services/discounts";
import { createBuffetOrder } from "../../../services/buffetOrders";
import { createCustomerOrder } from "../../../services/customerOrders";
import {
  createIntentForBuffetOrder,
  createIntentForCustomerOrder,
} from "../../../services/payment";
import { stripePromise } from "../../../stripe";
import { ensureCsrf } from "../../../services/http";
import { readCartTiming, wallNoZToISOZ } from "../../../utils/cartTiming";
import { getHoursStatus } from "../../../services/hours";
import { checkDeliveryEligibility } from "../../../services/delivery";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";
const CARD_BG = "#F4F7FB";

// keep in sync with backend app.order.min-lead-minutes
const SERVER_MIN_LEAD_MINUTES = 45;

type Errors = Record<string, string>;

type CheckoutAddress = {
  street: string;
  streetNo: string;
  plz: string;
  city: string;
};
type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: CheckoutAddress;
};

const emptyCustomer: CheckoutCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: { street: "", streetNo: "", plz: "", city: "" },
};

function calcDeliveryFee(
  orderType: OrderType,
  discountedItemsSubtotal: number
) {
  if (orderType !== "DELIVERY") return 0;
  return discountedItemsSubtotal >= 100 ? 0 : 5;
}
function money(n: number) {
  return `CHF ${n.toFixed(2)}`;
}

/* Small helper: convert local like "YYYY-MM-DDTHH:mm" to ISO with Z */
function toZ(when: string) {
  return new Date(when).toISOString();
}

/* ───────────────────────── Payment Step ───────────────────────── */
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

/* ───────────────────────── Checkout Page ───────────────────────── */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total: cartTotalFromCtx } = useCart();

  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      kind: "MENU" | "BUFFET";
      id: string;
      quantity: number;
    }>;
  }, [state]);

  const hasMenu = cartLines.some((l) => l.kind === "MENU");
  const hasBuffet = cartLines.some((l) => l.kind === "BUFFET");

  const orderType: OrderType = state.orderType;
  const itemsSubtotal = Number.isFinite(cartTotalFromCtx)
    ? (cartTotalFromCtx as number)
    : 0;

  const [disc, setDisc] = React.useState<{ menu: number; buffet: number }>({
    menu: 0,
    buffet: 0,
  });
  React.useEffect(() => {
    getActiveDiscount()
      .then((d: ActiveDiscountDTO) =>
        setDisc({
          menu: Number(d.percentMenu) || 0,
          buffet: Number(d.percentBuffet) || 0,
        })
      )
      .catch(() => setDisc({ menu: 0, buffet: 0 }));
  }, []);

  const percent = hasBuffet ? disc.buffet : disc.menu;
  const discountAmount = +(itemsSubtotal * (percent / 100)).toFixed(2);
  const discountedItems = +(itemsSubtotal - discountAmount).toFixed(2);
  const vat = +(discountedItems * 0.026).toFixed(2);
  const deliveryFee = calcDeliveryFee(orderType, discountedItems);
  const grand = +(discountedItems + vat + deliveryFee).toFixed(2);
  const minDeliveryNotMet = orderType === "DELIVERY" && itemsSubtotal < 30;

  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [preparing, setPreparing] = React.useState(false);

  const [customer, setCustomer] =
    React.useState<CheckoutCustomer>(emptyCustomer);

  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodType>(
    PaymentMethod.CARD
  );

  /* ─────────── dynamic delivery eligibility (backend-based) ─────────── */
  const [eligibility, setEligibility] = React.useState<{
    deliverable: boolean;
    message?: string;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (orderType !== "DELIVERY") {
        if (!cancelled) setEligibility({ deliverable: true });
        return;
      }
      // ✅ digits-only for backend, avoids false negatives
      const raw = customer.address.plz || "";
      const digits = raw.replace(/\D/g, "");

      // Don’t show red error before the user enters a plausible PLZ.
      if (digits.length !== 4) {
        if (!cancelled) setEligibility(null);
        return;
      }

      try {
        const res = await checkDeliveryEligibility("DELIVERY", digits);
        if (!cancelled)
          setEligibility({
            deliverable: !!res.deliverable,
            message: res.message || undefined,
          });
      } catch {
        if (!cancelled)
          setEligibility({
            deliverable: false,
            message: "Unable to verify delivery area.",
          });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [orderType, customer.address.plz]);

  /* ───────────────────── Validation helpers ───────────────────── */
  const applyBackendErrors = (details: Record<string, string>) => {
    const mapped: Errors = {};
    Object.entries(details).forEach(([k, v]) => {
      const short = k.replace(/^customerInfo\./, "");
      mapped[short] = v;
    });
    setFieldErrors(mapped);
  };

  const validate = (c: CheckoutCustomer): Errors => {
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

  const handleInput =
    (path: string) => (ev: React.ChangeEvent<HTMLInputElement>) => {
      const v = ev.target.value;
      setCustomer((prev): CheckoutCustomer => {
        const a = { ...prev.address };
        switch (path) {
          case "firstName":
            return { ...prev, firstName: v };
          case "lastName":
            return { ...prev, lastName: v };
          case "email":
            return { ...prev, email: v };
          case "phone":
            return { ...prev, phone: v };
          case "address.street":
            return { ...prev, address: { ...a, street: v } };
          case "address.streetNo":
            return { ...prev, address: { ...a, streetNo: v } };
          case "address.plz":
            return { ...prev, address: { ...a, plz: v } };
          case "address.city":
            return { ...prev, address: { ...a, city: v } };
          default:
            return prev;
        }
      });
    };

  /* ───────────────────── Order prep & payment ───────────────────── */
  const preparePayment = async () => {
    try {
      setError(undefined);
      setFieldErrors({});

      if (!cartLines.length) {
        setError("Your cart is empty.");
        return;
      }
      if (hasMenu && hasBuffet) {
        setError(
          "Mixed cart (menu + buffet) is not supported yet. Please order separately."
        );
        return;
      }

      const errs = validate(customer);
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setError("Please fix the highlighted fields.");
        return;
      }

      if (
        orderType === "DELIVERY" &&
        (!eligibility || eligibility.deliverable === false)
      ) {
        setError(
          eligibility?.message || "We currently do not deliver to this address."
        );
        return;
      }

      if (minDeliveryNotMet) {
        setError("Minimum delivery order is CHF 30.00.");
        return;
      }

      // ⬇️ Pre-check hours for the TARGET time
      const timing = readCartTiming();
      const targetAtIso = timing.asap
        ? new Date(Date.now() + SERVER_MIN_LEAD_MINUTES * 60_000).toISOString()
        : timing.scheduledAt
        ? wallNoZToISOZ(timing.scheduledAt) // ✅ correct instant
        : new Date().toISOString();

      const hours = await getHoursStatus(orderType, targetAtIso);
      if (!hours.openNow) {
        setError(
          hours.windowOpensAt
            ? `${hours.message} Next open: ${new Date(
                hours.windowOpensAt
              ).toLocaleString()}`
            : hours.message || "We’re closed."
        );
        return;
      }
      // ⬆️ End hours pre-check

      setPreparing(true);
      await ensureCsrf();

      // Build a null-safe timing block (no scheduledAt: null)
      const timingBlockMenu = timing.asap
        ? { asap: true as const }
        : timing.scheduledAt
        ? { asap: false as const, scheduledAt: timing.scheduledAt }
        : { asap: false as const };

      if (hasMenu) {
        const payload: CustomerOrderWriteDTO = {
          userId: undefined,
          customerInfo: customer as any,
          orderType,
          specialInstructions: undefined,
          items: cartLines.map((l) => ({
            menuItemId: l.id,
            quantity: l.quantity,
          })),
          paymentMethod,
          ...timingBlockMenu,
        };

        const order = await createCustomerOrder(payload);
        if (paymentMethod === PaymentMethod.CARD) {
          const pi = await createIntentForCustomerOrder(order.id);
          setClientSecret(pi.clientSecret);
        } else {
          window.location.href = "/thank-you";
        }
      } else {
        const timingBlockBuffet = timing.asap
          ? { asap: true as const }
          : timing.scheduledAt
          ? { asap: false as const, scheduledAt: timing.scheduledAt }
          : { asap: false as const };

        const payload: BuffetOrderWriteDTO = {
          userId: undefined,
          customerInfo: customer as any,
          orderType,
          specialInstructions: undefined,
          items: cartLines.map((l) => ({
            buffetItemId: l.id,
            quantity: l.quantity,
          })),
          paymentMethod,
          ...timingBlockBuffet,
        };

        const order = await createBuffetOrder(payload);
        if (paymentMethod === PaymentMethod.CARD) {
          const pi = await createIntentForBuffetOrder(order.id);
          setClientSecret(pi.clientSecret);
        } else {
          window.location.href = "/thank-you";
        }
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

  /* ───────────────────── Order Summary ───────────────────── */
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
        <Row label="Items" value={money(itemsSubtotal)} />
        {percent > 0 && (
          <Row
            label={`Discount (${percent}%)`}
            value={`- ${money(discountAmount)}`}
          />
        )}
        <Row label="Items after discount" value={money(discountedItems)} />
        <Row label="VAT (2.6%)" value={money(vat)} />
        <Row
          label="Delivery fee"
          value={
            orderType === "DELIVERY" && discountedItems >= 100
              ? "CHF 0.00 (free at CHF 100)"
              : money(deliveryFee)
          }
        />

        <Divider sx={{ my: 1 }} />

        <Row
          label={<strong>Total</strong>}
          value={<strong>{money(grand)}</strong>}
        />
      </Box>

      <Box sx={{ mt: 1.5, display: "flex", gap: 1, alignItems: "center" }}>
        {percent > 0 && <Chip size="small" label={`${percent}% off active`} />}
        <Chip
          size="small"
          label={
            paymentMethod === PaymentMethod.CARD
              ? "Card (online)"
              : paymentMethod === PaymentMethod.TWINT
              ? "TWINT"
              : paymentMethod === PaymentMethod.POS_CARD
              ? "POS Card"
              : "Cash"
          }
        />
      </Box>
    </Paper>
  );

  /* ───────────────────── Render ───────────────────── */
  if (!clientSecret) {
    // Disable button if:
    // - preparing OR
    // - delivery & clearly not deliverable OR
    // - delivery min not met OR
    // - delivery and PLZ incomplete (avoid false positives)
    const plzEntered = (customer.address.plz || "").trim().length >= 4;
    const cannotDeliver =
      orderType === "DELIVERY" &&
      ((eligibility && !eligibility.deliverable) ||
        (!eligibility && !plzEntered));

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
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 800, color: AK_DARK }}
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
              />
              <TextField
                label="Last name"
                fullWidth
                value={customer.lastName}
                onChange={handleInput("lastName")}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={customer.email}
                onChange={handleInput("email")}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
              />
              <TextField
                label="Phone"
                fullWidth
                value={customer.phone}
                onChange={handleInput("phone")}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
              />
              <TextField
                label="Street"
                fullWidth
                value={customer.address.street}
                onChange={handleInput("address.street")}
                error={!!fieldErrors["address.street"]}
                helperText={fieldErrors["address.street"]}
                sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
              />
              <TextField
                label="No."
                fullWidth
                value={customer.address.streetNo}
                onChange={handleInput("address.streetNo")}
                error={!!fieldErrors["address.streetNo"]}
                helperText={fieldErrors["address.streetNo"]}
              />
              <TextField
                label="PLZ"
                fullWidth
                value={customer.address.plz}
                onChange={handleInput("address.plz")}
                error={!!fieldErrors["address.plz"]}
                helperText={fieldErrors["address.plz"]}
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 8,
                }}
              />

              <TextField
                label="City"
                fullWidth
                value={customer.address.city}
                onChange={handleInput("address.city")}
                error={!!fieldErrors["address.city"]}
                helperText={fieldErrors["address.city"]}
              />
            </Box>

            <Typography sx={{ mt: 3, mb: 1, fontWeight: 700, color: AK_DARK }}>
              Payment method
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={paymentMethod}
              onChange={(_, val) => {
                if (val) setPaymentMethod(val as PaymentMethodType);
              }}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <ToggleButton value={PaymentMethod.CARD}>
                Card (online)
              </ToggleButton>
              <ToggleButton value={PaymentMethod.TWINT}>TWINT</ToggleButton>
              <ToggleButton value={PaymentMethod.POS_CARD}>
                POS Card
              </ToggleButton>
              <ToggleButton value={PaymentMethod.CASH}>Cash</ToggleButton>
            </ToggleButtonGroup>

            {paymentMethod !== PaymentMethod.CARD && (
              <Alert severity="info" sx={{ mt: 2 }}>
                You will pay at pickup or upon delivery.
              </Alert>
            )}

            {orderType === "DELIVERY" &&
              eligibility &&
              !eligibility.deliverable && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {eligibility.message ||
                    "We currently do not deliver to this address."}
                </Alert>
              )}

            {minDeliveryNotMet && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Minimum delivery order is CHF 30.00.
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
                disabled={preparing || cannotDeliver || minDeliveryNotMet}
                sx={{
                  bgcolor: AK_GOLD,
                  color: AK_DARK,
                  fontWeight: 800,
                  "&:hover": { bgcolor: "#E2B437" },
                }}
              >
                {paymentMethod === PaymentMethod.CARD
                  ? preparing
                    ? "Preparing..."
                    : "Continue to payment"
                  : preparing
                  ? "Placing order..."
                  : "Place order"}
              </Button>
            </Box>
          </Paper>

          {OrderSummary}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1080, mx: "auto" }}>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentStep totalToPay={grand} summary={OrderSummary} />
      </Elements>
    </Box>
  );
}

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
