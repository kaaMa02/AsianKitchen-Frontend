import * as React from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Box, Button, Typography, Alert } from "@mui/material";
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
      >
        Pay CHF {total.toFixed(2)}
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

  // 2) normalize cart lines
  const cartLines = React.useMemo(() => {
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
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
          customerInfo: customer, // ✅ send real customer info
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
          customerInfo: customer, // ✅ send real customer info
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
      // surface backend validation nicely if present
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
      <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
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

          {/* street uses full width on mobile, first column on desktop */}
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
          >
            {preparing ? "Preparing…" : "Continue to payment"}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentStep />
    </Elements>
  );
}
