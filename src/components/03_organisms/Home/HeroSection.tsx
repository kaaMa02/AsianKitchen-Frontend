// src/components/03_sections/home/HeroSection.tsx
import Box from '@mui/material/Box';
import MuiContainer from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AKButton from '../../01_atoms/AKButton';
import { useRestaurantInfoCtx } from '../../../contexts/RestaurantInfoContext';

const NAV_H_XS = 56;
const NAV_H_MD = 64;

export default function HeroSection() {
  const { info, isLoading } = useRestaurantInfoCtx();
  const name = info?.name ?? '';

  return (
    <Box
      component="header"
      sx={{
        // viewport height minus fixed navbar
        minHeight: { xs: `calc(100vh - ${NAV_H_XS}px)`, md: `calc(100vh - ${NAV_H_MD}px)` },
        // push content below navbar
        pt: { xs: `${NAV_H_XS}px`, md: `${NAV_H_MD}px` },
        bgcolor: '#0B2D24',
      }}
    >
      <MuiContainer
        maxWidth="xl"
        sx={{
          // center the whole content block vertically
          minHeight: 'inherit',
          display: 'grid',
          alignContent: 'center',
        }}
      >
        <Box sx={{ maxWidth: { xs: '100%', md: 820 } }}>
          {/* “Welcome to” — a bit bigger, not bold */}
          <Typography
            variant="h1"
            sx={{
              color: '#EFE7CE',
              fontWeight: 500,
              lineHeight: 1.06,
              fontSize: { xs: 50, md: 74 }, // was smaller; now a bit bigger
              letterSpacing: '-0.01em',
            }}
          >
            Welcome to
          </Typography>

          {/* “Asian Kitchen” — keep bold */}
          <Typography
            component="h2"
            sx={{
              color: '#EFE7CE',
              fontSize: { xs: 56, md: 86 }, // keep strong but not too huge
              fontWeight: 800,
              letterSpacing: '-0.02em',
              mt: { xs: 1, md: 1.25 },
              minHeight: '1.2em',
            }}
          >
            {isLoading ? ' ' : name}
          </Typography>

          {/* Buttons grid */}
          <Box
            sx={{
              mt: { xs: 4.5, md: 6 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              width: '100%',
            }}
          >
            {[
              { label: 'À la carte', href: '/menu' },
              { label: 'Reservation', href: '/reservation' },
              { label: 'Delivery', href: '/delivery' },
              { label: 'Takeaway', href: '/takeaway' },
            ].map((b) => (
              <AKButton key={b.href} asLinkHref={b.href}>
                {b.label}
              </AKButton>
            ))}
          </Box>
        </Box>
      </MuiContainer>
    </Box>
  );
}
