import * as React from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton,
  ListItemText, Box, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useContext } from 'react';
import { AuthContext } from '../../../../contexts/AuthContext';

const AK_DARK = '#0B2D24';
const AK_GOLD = '#D1A01F';

const NAV = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/reservations', label: 'Reservations' },
  { to: '/admin/restaurant-info', label: 'Restaurant Info' },
  { to: '/admin/food-items', label: 'Food Items' },
  { to: '/admin/menu-items', label: 'Menu Items' },
  { to: '/admin/buffet-items', label: 'Buffet Items' },
  { to: '/admin/users', label: 'Users' },
];

export default function AdminLayout() {
  const [open, setOpen] = React.useState(false);
  const { logout, username } = useContext(AuthContext);
  const loc = useLocation();

  const drawer = (
    <Box sx={{ width: 260 }}>
      <Box sx={{ p: 2, bgcolor: AK_DARK, color: '#EFE7CE' }}>
        <Typography sx={{ fontWeight: 800 }}>Admin</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>{username}</Typography>
      </Box>
      <List>
        {NAV.map(item => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            selected={loc.pathname === item.to || (item.to !== '/admin' && loc.pathname.startsWith(item.to))}
            onClick={() => setOpen(false)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F0DE' }}>
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: AK_DARK }}>
        <Toolbar>
          <IconButton onClick={() => setOpen(true)} edge="start" color="inherit" sx={{ mr: 1, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography sx={{ flex: 1, color: '#EFE7CE', fontWeight: 800 }}>
            Asian Kitchen — Admin
          </Typography>
          <Button
            onClick={logout}
            variant="contained"
            sx={{ bgcolor: AK_GOLD, color: AK_DARK, fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Box sx={{ display: 'flex' }}>
        <Box sx={{ width: 260, display: { xs: 'none', md: 'block' } }}>{drawer}</Box>
        <Drawer open={open} onClose={() => setOpen(false)} sx={{ display: { md: 'none' } }}>
          {drawer}
        </Drawer>

        <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
