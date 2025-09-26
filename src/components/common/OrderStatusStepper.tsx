import * as React from "react";
import { Box, Stepper, Step, StepLabel, Chip } from "@mui/material";
import { OrderStatus } from "../../types/api-types";

const STEPS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

export default function OrderStatusStepper({ status }: { status: OrderStatus }) {
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s === status)
  );

  // Cancelled: show a red chip instead of a progress bar
  if (status === "CANCELLED") {
    return (
      <Chip label="CANCELLED" color="error" variant="filled" sx={{ fontWeight: 700 }} />
    );
  }

  return (
    <Box>
      <Stepper activeStep={activeIndex} alternativeLabel>
        {STEPS.map((s) => (
          <Step key={s}>
            <StepLabel>{s.replaceAll("_", " ")}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
