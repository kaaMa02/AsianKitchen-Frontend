import * as React from "react";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SetMealIcon from "@mui/icons-material/SetMeal";
import RamenDiningIcon from "@mui/icons-material/RamenDining";
import StoreIcon from "@mui/icons-material/Store";
import PeopleIcon from "@mui/icons-material/People";
import LunchDiningIcon from "@mui/icons-material/LunchDining";
import { useAuth } from "../../../../contexts/AuthContext";
import { useAdminAlerts } from "../../../../contexts/AdminAlertsContext"; // <<< use counts

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

export default function AdminLayout() {
  const [open, setOpen] = React.useState(false);
  const { logout, username } = useAuth();
  const loc = useLocation();
  const { alerts } = useAdminAlerts();

  const links = [
    { to: "/admin", label: "Dashboard", icon: <DashboardIcon /> },
    {
      to: "/admin/reservations",
      label: "Reservations",
      icon: <EventSeatIcon />,
      count: alerts.reservationsRequested,
    },
    {
      to: "/admin/orders",
      label: "Menu Orders",
      icon: <ReceiptLongIcon />,
      count: alerts.ordersNew,
    },
    {
      to: "/admin/buffet-orders",
      label: "Buffet Orders",
      icon: <RamenDiningIcon />,
      count: alerts.buffetOrdersNew,
    },
    { to: "/admin/food-items", label: "Food Items", icon: <SetMealIcon /> },
    { to: "/admin/menu-items", label: "Menu Items", icon: <LunchDiningIcon /> },
    {
      to: "/admin/buffet-items",
      label: "Buffet Items",
      icon: <LunchDiningIcon />,
    },
    {
      to: "/admin/restaurant-info",
      label: "Restaurant Info",
      icon: <StoreIcon />,
    },
    { to: "/admin/users", label: "Users", icon: <PeopleIcon /> },
  ];

  const drawer = (
    <Box sx={{ width: 260, bgcolor: "#F6F0DE", height: "100%" }}>
      <Box sx={{ p: 2, fontWeight: 800, color: AK_DARK }}>Admin</Box>
      <List>
        {links.map((l) => {
          const active = loc.pathname === l.to;
          return (
            <ListItemButton
              key={l.to}
              component={RouterLink}
              to={l.to}
              onClick={() => setOpen(false)}
              sx={{
                borderLeft: active
                  ? `3px solid ${AK_GOLD}`
                  : "3px solid transparent",
                bgcolor: active ? "rgba(209,160,31,0.08)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box sx={{ mr: 1.25 }}>{l.icon}</Box>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{l.label}</span>
                    {typeof l.count === "number" && l.count > 0 && (
                      <Chip
                        size="small"
                        color="error"
                        label={l.count}
                        sx={{ height: 20 }}
                      />
                    )}
                  </Box>
                }
                primaryTypographyProps={{ sx: { color: AK_DARK } }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#faf9f3" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ bgcolor: AK_DARK, color: "#EFE7CE" }}
      >
        <Toolbar sx={{ color: "inherit" }}>
          {/* Keep the burger for mobile; the permanent left column still shows on desktop */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setOpen(true)}
            sx={{ mr: 1, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography sx={{ flex: 1, fontWeight: 800, color: "inherit" }}>
            Asian Kitchen · Admin
          </Typography>
          <Typography sx={{ mr: 2, opacity: 0.9, color: "inherit" }}>
            {username}
          </Typography>
          <Button
            variant="contained"
            onClick={logout}
            sx={{
              bgcolor: AK_GOLD,
              color: AK_DARK,
              fontWeight: 800,
              "&:hover": { bgcolor: "#E2B437" },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Toolbar />
      <Drawer open={open} onClose={() => setOpen(false)}>
        {drawer}
      </Drawer>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { md: "260px 1fr" },
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            borderRight: "1px solid #eee",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          {drawer}
        </Box>
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
