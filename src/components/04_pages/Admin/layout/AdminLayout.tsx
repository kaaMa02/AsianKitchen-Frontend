import * as React from "react";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Badge,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RamenDiningIcon from "@mui/icons-material/RamenDining";
import SetMealIcon from "@mui/icons-material/SetMeal";
import LunchDiningIcon from "@mui/icons-material/LunchDining";
import StoreIcon from "@mui/icons-material/Store";
import PeopleIcon from "@mui/icons-material/People";
import { useAuth } from "../../../../contexts/AuthContext";
import { useAdminAlerts } from "../../../../contexts/AdminAlertsContext";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

export default function AdminLayout() {
  const [open, setOpen] = React.useState(false);
  const { logout, username } = useAuth();
  const loc = useLocation();
  const { alerts } = useAdminAlerts();

  const totalAlerts =
    alerts.reservationsRequested + alerts.ordersNew + alerts.buffetOrdersNew;

  const items = [
    { to: "/admin", label: "Dashboard", icon: <DashboardIcon />, badge: 0 },
    {
      to: "/admin/reservations",
      label: "Reservations",
      icon: <EventSeatIcon />,
      badge: alerts.reservationsRequested,
    },
    {
      to: "/admin/orders",
      label: "Menu Orders",
      icon: <ReceiptLongIcon />,
      badge: alerts.ordersNew,
    },
    {
      to: "/admin/buffet-orders",
      label: "Buffet Orders",
      icon: <RamenDiningIcon />,
      badge: alerts.buffetOrdersNew,
    },
    {
      to: "/admin/food-items",
      label: "Food Items",
      icon: <SetMealIcon />,
      badge: 0,
    },
    {
      to: "/admin/menu-items",
      label: "Menu Items",
      icon: <LunchDiningIcon />,
      badge: 0,
    },
    {
      to: "/admin/buffet-items",
      label: "Buffet Items",
      icon: <LunchDiningIcon />,
      badge: 0,
    },
    {
      to: "/admin/restaurant-info",
      label: "Restaurant Info",
      icon: <StoreIcon />,
      badge: 0,
    },
    { to: "/admin/users", label: "Users", icon: <PeopleIcon />, badge: 0 },
  ];

  const drawer = (
    <Box sx={{ width: 280, bgcolor: "#F6F0DE", height: "100%" }}>
      <Box
        sx={{
          p: 2,
          fontWeight: 800,
          color: AK_DARK,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        Admin
        {totalAlerts > 0 && (
          <Chip
            size="small"
            color="error"
            label={`${totalAlerts} new`}
            sx={{ ml: "auto" }}
          />
        )}
      </Box>
      <List>
        {items.map((it) => {
          const active = loc.pathname === it.to;
          return (
            <ListItemButton
              key={it.to}
              component={RouterLink}
              to={it.to}
              onClick={() => setOpen(false)}
              sx={{
                borderLeft: active
                  ? `3px solid ${AK_GOLD}`
                  : "3px solid transparent",
                bgcolor: active ? "rgba(209,160,31,0.08)" : "transparent",
              }}
            >
              <Box sx={{ mr: 1.25, display: "flex", alignItems: "center" }}>
                {it.icon}
              </Box>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{it.label}</span>
                    {!!it.badge && (
                      <Chip size="small" color="error" label={it.badge} />
                    )}
                  </Box>
                }
                slotProps={{ primary: { sx: { color: AK_DARK } } }}
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
          <IconButton
            onClick={() => setOpen(true)}
            sx={{ mr: 1 }}
            // burger turns red & shows count when there are new alerts
            color={totalAlerts > 0 ? "error" : "inherit"}
          >
            <Badge color="error" badgeContent={totalAlerts} overlap="circular">
              <MenuIcon />
            </Badge>
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
      <Toolbar /> {/* spacer under appbar */}
      <Drawer open={open} onClose={() => setOpen(false)}>
        {drawer}
      </Drawer>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
