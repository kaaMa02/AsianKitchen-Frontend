// src/components/04_pages/Admin/layout/AdminLayout.tsx
import * as React from "react";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
  Button,
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
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useAuth } from "../../../../contexts/AuthContext";
import { useAdminAlerts } from "../../../../contexts/AdminAlertsContext";
import { setupAdminWebPush } from "../../../../services/webPush";
import { sound } from "../../../../utils/audio";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

type LinkDef = {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export default function AdminLayout() {
  const [open, setOpen] = React.useState(false);
  const loc = useLocation();
  const { logout, username } = useAuth();
  const { total } = useAdminAlerts();

  React.useEffect(() => {
    setupAdminWebPush().catch(() => {});
  }, []);

  // One-time user gesture unlock for audio autoplay
  React.useEffect(() => {
    const onGesture = () => {
      sound.enable().catch(() => {});
    };
    window.addEventListener("click", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  const links: LinkDef[] = [
    // Only this entry shows the combined "incoming" badge
    { to: "/admin", label: "New Orders, Reservations", icon: <DashboardIcon />, badge: total },

    { to: "/admin/discounts", label: "Discounts", icon: <LocalOfferIcon /> },
    { to: "/admin/reservations", label: "Reservations", icon: <EventSeatIcon /> },
    { to: "/admin/orders", label: "Menu Orders", icon: <ReceiptLongIcon /> },
    { to: "/admin/buffet-orders", label: "Buffet Orders", icon: <RamenDiningIcon /> },
    { to: "/admin/food-items", label: "Food Items", icon: <SetMealIcon /> },
    { to: "/admin/menu-items", label: "Menu Items", icon: <LunchDiningIcon /> },
    { to: "/admin/buffet-items", label: "Buffet Items", icon: <LunchDiningIcon /> },
    { to: "/admin/restaurant-info", label: "Restaurant Info", icon: <StoreIcon /> },
    { to: "/admin/users", label: "Users", icon: <PeopleIcon /> },
  ];

  const DrawerList = (
    <Box sx={{ width: 280, bgcolor: "#F6F0DE", height: "100%" }} role="presentation" onClick={() => setOpen(false)}>
      <Box sx={{ p: 2, fontWeight: 800, color: AK_DARK }}>Admin</Box>
      <List>
        {links.map((l) => {
          const active = loc.pathname === l.to;
          return (
            <Box key={l.to}>
              <ListItemButton
                component={RouterLink}
                to={l.to}
                sx={{
                  borderLeft: active ? `3px solid ${AK_GOLD}` : "3px solid transparent",
                  bgcolor: active ? "rgba(209,160,31,0.08)" : "transparent",
                }}
              >
                <ListItemIcon sx={{ color: AK_DARK, minWidth: 36 }}>
                  {typeof l.badge === "number" && l.badge > 0 ? (
                    <Badge color="error" badgeContent={l.badge}>
                      {l.icon}
                    </Badge>
                  ) : (
                    l.icon
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ color: AK_DARK, fontWeight: active ? 700 : 500 }}>
                      {l.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            </Box>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#faf9f3" }}>
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: AK_DARK, color: "#EFE7CE" }}>
        <Toolbar sx={{ color: "inherit" }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }}>
            {/* Badge on the hamburger matches Incoming total */}
            <Badge color="error" overlap="circular" invisible={!total} badgeContent={total}>
              <MenuIcon />
            </Badge>
          </IconButton>
          <Typography sx={{ flex: 1, fontWeight: 800, color: "inherit" }}>
            Asian Kitchen · Admin
          </Typography>
          <Typography sx={{ mr: 2, opacity: 0.9, color: "inherit" }}>{username}</Typography>
          <Button
            onClick={logout}
            size="small"
            disableElevation
            sx={{
              bgcolor: AK_GOLD,
              color: AK_DARK,
              fontWeight: 800,
              px: 2,
              height: 36,
              "&:hover": { bgcolor: "#E2B437" },
              "&:focus-visible": { outline: "none" },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Toolbar />
      <Drawer open={open} onClose={() => setOpen(false)}>
        {DrawerList}
      </Drawer>

      <Box sx={{ p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
