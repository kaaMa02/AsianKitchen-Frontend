// src/components/04_pages/CheckoutPage/CheckoutPage.tsx
import * as React from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Box, Button, Typography, Alert } from "@mui/material";
import { useCart } from "../../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import type {
  OrderType,
  BuffetOrderWriteDTO,
  CustomerOrderWriteDTO,
} from "../../../types/api-types";
import { createBuffetOrder } from "../../../services/buffetOrders";
import { createCustomerOrder } from "../../../services/customerOrders";
import {
  createIntentForBuffetOrder,
  createIntentForCustomerOrder,
} from "../../../services/payment";
import { stripePromise } from "../../../stripe";

function CheckoutForm() {
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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total } = useCart();
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [error, setError] = React.useState<string>();

  // Helper: read cart lines regardless of internal naming
  const cartLines = React.useMemo(() => {
    // try a few common shapes
    const anyState = state as any;
    return (anyState.lines ?? anyState.items ?? []) as Array<{
      kind: "MENU" | "BUFFET";
      id: string;
      quantity: number;
    }>;
  }, [state]);

  React.useEffect(() => {
    (async () => {
      setError(undefined);

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

      // Minimal customer info placeholders — replace with your form later
      const dummyCustomer = {
        firstName: "Guest",
        lastName: "Checkout",
        email: "guest@example.com",
        phone: "",
        address: { street: "", streetNo: "", plz: "", city: "" },
      };

      const orderType: OrderType = state.orderType; // already typed in your app

      if (hasMenu) {
        const payload: CustomerOrderWriteDTO = {
          userId: undefined,
          customerInfo: dummyCustomer,
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

        return;
      }

      if (hasBuffet) {
        const payload: BuffetOrderWriteDTO = {
          userId: undefined,
          customerInfo: dummyCustomer,
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

        return;
      }
    })().catch((e) => {
      console.error(e);
      setError("Failed to prepare checkout. Please try again.");
    });
  }, [cartLines, state.orderType]);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/menu")}>
          Back to Menu
        </Button>
      </Box>
    );
  }

  if (!clientSecret) {
    return <Typography sx={{ p: 3 }}>Preparing checkout…</Typography>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm />
    </Elements>
  );
}
