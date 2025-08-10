import Box from '@mui/material/Box';
import MuiContainer from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useRestaurantInfoCtx } from '../../../contexts/RestaurantInfoContext';
import { colors } from '../../../styles/theme';

export default function AboutSection() {
  const { info } = useRestaurantInfoCtx();
  const about = info?.aboutText ?? '';

  return (
    <Box
      id="about"
      component="section"
      bgcolor={colors.beigePale}
      sx={{
        py: { xs: 14, md: 20 },                 // taller section
        scrollMarginTop: { xs: 64, md: 80 },
      }}
    >
      <MuiContainer maxWidth="xl">
        {/* wider content block */}
        <Box sx={{ maxWidth: { xs: 760, md: 1280 }, mx: 'auto', textAlign: 'center' }}>
          <Typography
            component="h2"
            sx={{
              color: '#0B2D24',
              fontWeight: 800,
              mb: { xs: 3, md: 4 },
              fontSize: { xs: 38, md: 56 },      // bigger heading
              letterSpacing: '-0.01em',
              lineHeight: 1.12,
            }}
          >
            <span role="img" aria-label="aboutUs">✨</span>
            About us
          </Typography>

          <Typography
            sx={{
              color: '#0B2D24',
              fontSize: { xs: 20, md: 22 },       // bigger body
              lineHeight: { xs: 1.85, md: 1.9 },  // airy paragraphs
              mx: 'auto',
            }}
          >
            {about}
          </Typography>
        </Box>
      </MuiContainer>
    </Box>
  );
}
