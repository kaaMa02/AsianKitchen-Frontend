import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

export const theme = createTheme({
  palette: {
    primary: { main: '#C88C1A' },     // brand gold
    secondary: { main: '#0B2D24' },   // deep green
    error: { main: red.A400 },
    background: { default: '#0B2D24' }
  },
  typography: {
    fontFamily: '"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  shape: { borderRadius: 16 }
});

export const colors = {
  green: '#0B2D24',
  beige: '#F6F0DE',     // normal
  beigePale: '#EFE7CE', // paler
  cardOnBeige: '#EFE7CE',
  cardOnBeigePale: '#FBF7EA',
  accent: '#C88C1A',
  textOnBeige: '#0B2D24',
  textOnGreen: '#EFE7CE',
};

