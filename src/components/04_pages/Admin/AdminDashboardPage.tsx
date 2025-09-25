import * as React from "react";
import { Box, Paper, Typography, Button, Badge } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAdminAlerts } from "../../../contexts/AdminAlertsContext";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

type CardDef = {
  title: string;
  to: string;
  description: string;
  count?: number;
};

export default function AdminDashboard() {
  const { alerts } = useAdminAlerts();

  const cards: CardDef[] = [
    {
      title: "Reservations",
      to: "/admin/reservations",
      description: "Approve or reject reservations.",
      count: alerts.reservationsRequested,
    },
    {
      title: "Menu Orders",
      to: "/admin/orders",
      description: "See and update takeaway/delivery orders.",
      count: alerts.ordersNew,
    },
    {
      title: "Buffet Orders",
      to: "/admin/buffet-orders",
      description: "See and update buffet orders.",
      count: alerts.buffetOrdersNew,
    },
    {
      title: "Food Items",
      to: "/admin/food-items",
      description: "Create base dishes (names/descriptions).",
    },
    {
      title: "Menu Items",
      to: "/admin/menu-items",
      description: "Price and publish dishes for menu.",
    },
    {
      title: "Buffet Items",
      to: "/admin/buffet-items",
      description: "Manage buffet-specific items.",
    },
    {
      title: "Restaurant Info",
      to: "/admin/restaurant-info",
      description: "Address, hours, delivery rules.",
    },
    {
      title: "Users",
      to: "/admin/users",
      description: "Manage admin accounts.",
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
      }}
    >
      {cards.map((c) => (
        <Paper
          key={c.to}
          elevation={0}
          sx={{
            p: 3,
            border: "1px solid #E2D9C2",
            bgcolor: "#f5efdf",
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="h6"
              sx={{ color: AK_DARK, fontWeight: 800, flex: 1 }}
            >
              {c.title}
            </Typography>
            {!!c.count && <Badge color="error" badgeContent={c.count} />}
          </Box>
          <Typography sx={{ color: AK_DARK, opacity: 0.9, mt: 0.5, mb: 2 }}>
            {c.description}
          </Typography>
          <Button
            component={RouterLink}
            to={c.to}
            variant="contained"
            sx={{
              bgcolor: AK_GOLD,
              color: AK_DARK,
              fontWeight: 800,
              "&:hover": { bgcolor: "#E2B437" },
            }}
          >
            Open
          </Button>
        </Paper>
      ))}
    </Box>
  );
}
