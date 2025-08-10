import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import MuiContainer from '@mui/material/Container';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';

const linkSx = {
  color: '#EFE7CE',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  fontSize: { xs: 12, md: 14 },
  '&:hover': { opacity: 0.9, textDecoration: 'none' },
};

export default function Navbar() {
  return (
    <AppBar position="fixed" elevation={0} sx={{ bgcolor: '#0B2D24' }}>
      <MuiContainer maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 56, md: 64 },
            width: '100%',
            justifyContent: 'flex-end',
          }}
        >
          <Box component="nav" aria-label="Primary" sx={{ display: 'flex', gap: { xs: 3, md: 6 } }}>
            {/* absolute hashes so they work from anywhere */}
            <Link component={RouterLink} underline="none" to="/#about" sx={linkSx}>About Us</Link>
            <Link component={RouterLink} underline="none" to="/#location" sx={linkSx}>Location</Link>
            <Link component={RouterLink} underline="none" to="/#contact" sx={linkSx}>Contact</Link>
            {/* go straight to menu */}
            <Link component={RouterLink} underline="none" to="/menu" sx={linkSx}>Menu</Link>
          </Box>
        </Toolbar>
      </MuiContainer>
    </AppBar>
  );
}