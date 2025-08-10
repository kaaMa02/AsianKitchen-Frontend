import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';

import { useCart } from '../../../contexts/CartContext';
import { OrderType } from '../../../types/api-types';

type Props = { open: boolean; onClose: () => void };

const MIN_TOTAL = 20;

export default function CartDrawer({ open, onClose }: Props) {
  const nav = useNavigate();
  const { state, inc, dec, remove, clear, total, setOrderType } = useCart();

  const canCheckout = state.lines.length > 0 && total >= MIN_TOTAL;

  const handleOrderType = (_: unknown, val: OrderType | null) => {
    if (val) setOrderType(val);
  };

  const goCheckout = () => {
    onClose();
    nav('/checkout');
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: 320, md: 380 }, p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0B2D24', flex: 1 }}>
            Your Cart
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close cart">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Empty */}
        {state.lines.length === 0 ? (
          <Typography sx={{ color: '#0B2D24' }}>Your cart is empty.</Typography>
        ) : (
          <>
            {/* Lines */}
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              {state.lines.map((l) => (
                <Box
                  key={l.key}
                  sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center' }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#0B2D24' }}>{l.name}</Typography>
                    <Typography sx={{ color: '#0B2D24', opacity: 0.85 }}>
                      {l.priceChf} × {l.quantity}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={() => dec(l.key)} size="small" variant="outlined" aria-label="Decrease">
                      -
                    </Button>
                    <Button onClick={() => inc(l.key)} size="small" variant="outlined" aria-label="Increase">
                      +
                    </Button>
                    <Button onClick={() => remove(l.key)} size="small" color="error" variant="text" aria-label="Remove">
                      Remove
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Totals & controls */}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#0B2D24' }}>
              <Typography sx={{ fontWeight: 800 }}>Total</Typography>
              <Typography sx={{ fontWeight: 800 }}>CHF {total.toFixed(2)}</Typography>
            </Box>

            {/* Order type toggle */}
            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ color: '#0B2D24', mb: 0.75, fontWeight: 700 }}>Order type</Typography>
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

            {/* Min total hint */}
            {!canCheckout && (
              <Alert sx={{ mt: 1.5 }} severity="info" variant="outlined">
                Minimum order is CHF {MIN_TOTAL.toFixed(2)}.
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'grid', gap: 1.25, mt: 1.5 }}>
              <Button onClick={clear} variant="outlined">
                Clear cart
              </Button>
              <Button
                variant="contained"
                onClick={goCheckout}
                disabled={!canCheckout}
                sx={{ '&:hover': { bgcolor: '#0a241c' } }}
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
