import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { useCart } from '../../../contexts/CartContext';

type Props = { open: boolean; onClose: () => void };

export default function CartDrawer({ open, onClose }: Props) {
  const { state, inc, dec, remove, clear, total } = useCart();

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: 320, md: 380 }, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0B2D24', flex: 1 }}>
            Your Cart
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {state.lines.length === 0 ? (
          <Typography sx={{ color: '#0B2D24' }}>Your cart is empty.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {state.lines.map((l) => (
              <Box key={l.key} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#0B2D24' }}>{l.name}</Typography>
                  <Typography sx={{ color: '#0B2D24', opacity: 0.85 }}>
                    {l.priceChf} × {l.quantity}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={() => dec(l.key)} size="small" variant="outlined">-</Button>
                  <Button onClick={() => inc(l.key)} size="small" variant="outlined">+</Button>
                  <Button onClick={() => remove(l.key)} size="small" color="error" variant="text">Remove</Button>
                </Box>
              </Box>
            ))}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0B2D24' }}>
              <Typography>Total</Typography>
              <Typography>CHF {total.toFixed(2)}</Typography>
            </Box>
            <Button onClick={clear} variant="outlined">Clear cart</Button>
            <Button variant="contained" sx={{ bgcolor: '#0B2D24', '&:hover': { bgcolor: '#0a241c' } }}>
              Checkout (coming soon)
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
