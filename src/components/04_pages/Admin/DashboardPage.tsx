import * as React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const cardSx = { p: 3, borderRadius: 2, border: '1px solid #E2D9C2', bgcolor: '#f5efdf' } as const;

const Tile = ({ title, to, desc }:{title:string;to:string;desc:string}) => (
  <Paper elevation={0} sx={cardSx}>
    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0B2D24' }}>{title}</Typography>
    <Typography sx={{ color: '#0B2D24', opacity: .9, my: 1 }}>{desc}</Typography>
    <Button component={RouterLink} to={to} variant="contained" sx={{ bgcolor: '#D1A01F', color: '#0B2D24', fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}>
      Open
    </Button>
  </Paper>
);

export default function DashboardPage() {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: '#0B2D24' }}>Dashboard</Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2
        }}
      >
        <Tile title="Reservations" to="/admin/reservations" desc="Review, confirm or reject reservations." />
        <Tile title="Restaurant Info" to="/admin/restaurant-info" desc="Edit address, hours & contact." />
        <Tile title="Food Items" to="/admin/food-items" desc="Create & edit base dishes." />
        <Tile title="Menu Items" to="/admin/menu-items" desc="Price, category & availability." />
        <Tile title="Buffet Items" to="/admin/buffet-items" desc="Manage buffet availability & price." />
        <Tile title="Users" to="/admin/users" desc="Manage admin/customer accounts." />
      </Box>
    </Box>
  );
}
