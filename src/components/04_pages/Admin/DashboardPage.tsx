import { Box, Paper, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const AK_DARK = '#0B2D24';
const AK_GOLD = '#D1A01F';

const card = {
  p: 3,
  borderRadius: 2,
  border: '1px solid #E2D9C2',
  bgcolor: '#f5efdf',
  display: 'grid',
  gap: 1,
} as const;

function Tile({ title, to, description }: { title: string; to: string; description?: string }) {
  return (
    <Paper elevation={0} sx={card}>
      <Typography sx={{ color: AK_DARK, fontWeight: 800 }}>{title}</Typography>
      {description && <Typography sx={{ color: AK_DARK, opacity: 0.8 }}>{description}</Typography>}
      <Box>
        <Button
          component={RouterLink}
          to={to}
          variant="contained"
          sx={{ bgcolor: AK_GOLD, color: AK_DARK, fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}
        >
          Open
        </Button>
      </Box>
    </Paper>
  );
}

export default function AdminDashboardPage() {
  return (
    <Box sx={{ bgcolor: '#F6F0DE', minHeight: '100vh', p: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: AK_DARK }}>
          Admin Dashboard
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <Tile title="Reservations" to="/admin/reservations" description="Approve / Reject reservations." />
          <Tile title="Customer Orders" to="/admin/orders" description="Track and update a-la-carte orders." />
          <Tile title="Buffet Orders" to="/admin/buffet-orders" description="Track and update buffet orders." />
          <Tile title="Menu Items" to="/admin/menu-items" description="CRUD for menu items." />
          <Tile title="Buffet Items" to="/admin/buffet-items" description="CRUD for buffet items." />
          <Tile title="Food Items" to="/admin/food-items" description="CRUD for food item catalog." />
          <Tile title="Restaurant Info" to="/admin/restaurant-info" description="Contact, address, hours, etc." />
          <Tile title="Users" to="/admin/users" description="Manage admin/customer users." />
        </Box>
      </Box>
    </Box>
  );
}
