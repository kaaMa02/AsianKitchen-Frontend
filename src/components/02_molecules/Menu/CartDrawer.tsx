// src/components/cart/CartDrawer.tsx
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../../contexts/CartContext";
import { OrderType } from "../../../types/api-types";
import { getActiveDiscount } from "../../../services/discounts";
import CartTimingWidget from "./CartTimingWidget";
import { readCartTiming, wallNoZToISOZ } from "../../../utils/cartTiming";
import { getHoursStatus } from "../../../services/hours";

type Props = { open: boolean; onClose: () => void };

const MIN_DELIVERY_TOTAL = 30;
const SERVER_MIN_LEAD_MINUTES = 45;

export default function CartDrawer({ open, onClose }: Props) {
  const nav = useNavigate();
  const { state, inc, dec, remove, clear, total, setOrderType } = useCart();
  const [discount, setDiscount] = useState<{ menu: number; buffet: number }>({
    menu: 0,
    buffet: 0,
  });

  useEffect(() => {
    getActiveDiscount()
      .then((d) =>
        setDiscount({
          menu: Number(d.percentMenu) || 0,
          buffet: Number(d.percentBuffet) || 0,
        })
      )
      .catch(() => setDiscount({ menu: 0, buffet: 0 }));
  }, []);

  const hasBuffet = useMemo(
    () => state.lines.some((l) => l.kind === "BUFFET"),
    [state.lines]
  );
  const percent = hasBuffet ? discount.buffet : discount.menu;

  const canCheckoutSubtotal =
    state.lines.length > 0 &&
    (state.orderType === OrderType.DELIVERY
      ? total >= MIN_DELIVERY_TOTAL
      : true);

  // live status for ASAP / scheduled target time
  const [hoursOk, setHoursOk] = useState<boolean | null>(null);
  const [hoursMsg, setHoursMsg] = useState<string>("");

  const refreshHours = async () => {
    try {
      const timing = readCartTiming();

      const targetAtIso =
        timing.asap === true
          ? new Date(
              Date.now() + SERVER_MIN_LEAD_MINUTES * 60_000
            ).toISOString()
          : timing.scheduledAt
          ? wallNoZToISOZ(timing.scheduledAt) // ✅ one conversion, no double-shift
          : null;

      if (!targetAtIso) {
        setHoursOk(null);
        setHoursMsg("");
        return;
      }

      const s = await getHoursStatus(state.orderType as OrderType, targetAtIso);
      setHoursOk(s.openNow);
      setHoursMsg(
        s.openNow
          ? ""
          : s.windowOpensAt
          ? `${s.message} Next open: ${new Date(
              s.windowOpensAt
            ).toLocaleString()}`
          : s.message || "We’re closed."
      );
    } catch {
      setHoursOk(null);
      setHoursMsg("");
    }
  };

  // On open and when order type changes
  useEffect(() => {
    if (open) refreshHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state.orderType]);

  // 🔔 React immediately to ASAP/Schedule/time changes (no page refresh)
  useEffect(() => {
    const handler = () => {
      void refreshHours();
    };
    window.addEventListener("ak:cartTiming", handler);
    return () => window.removeEventListener("ak:cartTiming", handler);
  }, []);

  const canCheckout = canCheckoutSubtotal && hoursOk !== false;

  const handleOrderType = (_: unknown, val: OrderType | null) => {
    if (val) setOrderType(val);
  };

  const goCheckout = () => {
    onClose();
    nav("/checkout");
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: 320, md: 380 }, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: "#0B2D24", flex: 1 }}
          >
            Your Cart
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close cart">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {state.lines.length === 0 ? (
          <Typography sx={{ color: "#0B2D24" }}>Your cart is empty.</Typography>
        ) : (
          <>
            <Box sx={{ display: "grid", gap: 1.25 }}>
              {state.lines.map((l) => (
                <Box
                  key={l.key}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: "#0B2D24" }}>
                      {l.name}
                    </Typography>
                    <Typography sx={{ color: "#0B2D24", opacity: 0.85 }}>
                      {l.priceChf} × {l.quantity}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      onClick={() => dec(l.key)}
                      size="small"
                      variant="outlined"
                      aria-label="Decrease"
                    >
                      -
                    </Button>
                    <Button
                      onClick={() => inc(l.key)}
                      size="small"
                      variant="outlined"
                      aria-label="Increase"
                    >
                      +
                    </Button>
                    <Button
                      onClick={() => remove(l.key)}
                      size="small"
                      color="error"
                      variant="text"
                      aria-label="Remove"
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 1.5 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                color: "#0B2D24",
              }}
            >
              <Typography sx={{ fontWeight: 800 }}>Subtotal</Typography>
              <Typography sx={{ fontWeight: 800 }}>
                CHF {total.toFixed(2)}
              </Typography>
            </Box>

            {percent > 0 && (
              <Chip
                size="small"
                sx={{ mt: 1 }}
                label={`${percent}% off active`}
              />
            )}

            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ color: "#0B2D24", mb: 0.75, fontWeight: 700 }}>
                Order type
              </Typography>
              <ToggleButtonGroup
                value={state.orderType as OrderType}
                exclusive
                onChange={handleOrderType}
                size="small"
                aria-label="Order type"
              >
                <ToggleButton value={OrderType.TAKEAWAY}>Takeaway</ToggleButton>
                <ToggleButton value={OrderType.DELIVERY}>Delivery</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {state.orderType === OrderType.DELIVERY &&
              total < MIN_DELIVERY_TOTAL && (
                <Alert sx={{ mt: 1.5 }} severity="info" variant="outlined">
                  Minimum delivery order is CHF {MIN_DELIVERY_TOTAL.toFixed(2)}.
                </Alert>
              )}

            {/* Timing selector (writes to localStorage and notifies this drawer) */}
            <Box sx={{ mt: 1.5 }}>
              <CartTimingWidget
                defaultMinPrepMinutes={SERVER_MIN_LEAD_MINUTES}
              />
            </Box>

            {/* Hours warning (applies to both ASAP target and the selected scheduled time) */}
            {hoursOk === false && (
              <Alert sx={{ mt: 1.5 }} severity="warning" variant="outlined">
                {hoursMsg || "Selected time is currently unavailable."}
              </Alert>
            )}

            <Box sx={{ display: "grid", gap: 1.25, mt: 1.5 }}>
              <Button onClick={clear} variant="outlined">
                Clear cart
              </Button>
              <Button
                variant="contained"
                onClick={goCheckout}
                disabled={!canCheckout}
                sx={{ "&:hover": { bgcolor: "#0a241c" } }}
              >
                Go to checkout
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
