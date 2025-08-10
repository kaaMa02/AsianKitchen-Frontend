// src/components/03_organisms/Navbar.tsx
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import MuiContainer from '@mui/material/Container';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';

export const NAV_H_XS = 56; // export so Hero can reuse
export const NAV_H_MD = 64;

const linkSx = {
  color: '#EFE7CE',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  fontSize: { xs: 12, md: 14 },
  fontWeight: 600,
  '&:hover': { opacity: 0.9, textDecoration: 'none' },
} as const;

export default function Navbar() {
  return (
    <AppBar position="fixed" elevation={0} sx={{ bgcolor: '#0B2D24' }}>
      <MuiContainer maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: NAV_H_XS, md: NAV_H_MD },
            width: '100%',
          }}
        >
          <Box
            component="nav"
            aria-label="Primary"
            sx={{ ml: 'auto', display: 'flex', gap: { xs: 3, md: 6 } }}
          >
            <Link underline="none" href="#about" sx={linkSx}>
              About Us
            </Link>
            <Link underline="none" href="#location" sx={linkSx}>
              Location
            </Link>
            <Link underline="none" href="#contact" sx={linkSx}>
              Contact
            </Link>
            <Link underline="none" href="#info" sx={linkSx}>
              Info
            </Link>
          </Box>
        </Toolbar>
      </MuiContainer>
    </AppBar>
  );
}
