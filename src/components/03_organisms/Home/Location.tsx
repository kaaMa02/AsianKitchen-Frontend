// src/components/03_organisms/home/MapSection.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { useRestaurantInfoCtx } from '../../../contexts/RestaurantInfoContext';
import { colors } from '../../../styles/theme';

function formatAddress(street?: string, streetNo?: string, plz?: string, city?: string) {
  const line1 = [street, streetNo].filter(Boolean).join(' ');
  const line2 = [plz, city].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

function mapEmbedSrc(googleMapsUrl?: string, qFallback?: string) {
  if (!googleMapsUrl && !qFallback) return '';
  if (googleMapsUrl && googleMapsUrl.includes('/embed')) return googleMapsUrl;
  return `https://www.google.com/maps?q=${encodeURIComponent(qFallback || '')}&output=embed`;
}

export default function MapSection() {
  const { info } = useRestaurantInfoCtx();
  const addressStr = formatAddress(
    info?.address?.street,
    info?.address?.streetNo,
    info?.address?.plz,
    info?.address?.city
  );
  const mapSrc = React.useMemo(() => mapEmbedSrc(info?.googleMapsUrl, addressStr), [info?.googleMapsUrl, addressStr]);

  return (
    <Box
      id="location"
      component="section"
      bgcolor={colors.beige}
      sx={{ py: { xs: 10, md: 14 }, scrollMarginTop: { xs: 64, md: 80 } }}
    >
      <Container maxWidth="xl">
        {/* one centered wrapper controls width for title, cards, and map */}
        <Box sx={{ maxWidth: 1100, mx: 'auto', textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              color: '#0B2D24',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <span role="img" aria-label="sushi">🍣</span>
            Catch Us Here
          </Typography>

          {/* cards */}
          <Box
            sx={{
              mt: { xs: 3.5, md: 4.5 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
              textAlign: 'left', // keep card content left-aligned
            }}
          >
            <Paper
              variant="outlined"
              sx={{ p: { xs: 3, md: 4 }, bgcolor: '#FBF8ED', borderColor: 'rgba(11,45,36,0.12)' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <RoomOutlinedIcon sx={{ color: '#C88C1A', fontSize: 36 }} />
                <Typography variant="h6" sx={{ color: '#0B2D24', fontWeight: 700 }}>
                  Our Location
                </Typography>
              </Box>
              <Typography sx={{ mt: 1.5, color: '#0B2D24', fontSize: { xs: 16, md: 18 }, lineHeight: 1.7 }}>
                {addressStr || 'Address coming soon.'}
              </Typography>
            </Paper>

            <Paper
              variant="outlined"
              sx={{ p: { xs: 3, md: 4 }, bgcolor: '#FBF8ED', borderColor: 'rgba(11,45,36,0.12)' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LocalPhoneOutlinedIcon sx={{ color: '#C88C1A', fontSize: 36 }} />
                <Typography variant="h6" sx={{ color: '#0B2D24', fontWeight: 700 }}>
                  Contact
                </Typography>
              </Box>

              <Box sx={{ mt: 1.5, display: 'grid', gap: 0.75 }}>
                {info?.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailOutlinedIcon sx={{ color: '#0B2D24', fontSize: 20, opacity: 0.8 }} />
                    <Link href={`mailto:${info.email}`} underline="hover" sx={{ color: '#0B2D24', fontSize: { xs: 16, md: 18 } }}>
                      {info.email}
                    </Link>
                  </Box>
                )}
                {info?.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalPhoneOutlinedIcon sx={{ color: '#0B2D24', fontSize: 20, opacity: 0.8 }} />
                    <Link href={`tel:${info.phone.replace(/\s+/g, '')}`} underline="hover" sx={{ color: '#0B2D24', fontSize: { xs: 16, md: 18 } }}>
                      {info.phone}
                    </Link>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>

          {/* narrower map matching card width */}
          <Box sx={{ mt: { xs: 5, md: 7 } }}>
            {mapSrc ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: { xs: 340, md: 480 },
                  borderRadius: 1.5,
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="iframe"
                  title="Google Maps"
                  src={mapSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  sx={{ position: 'absolute', inset: 0, border: 0, width: '100%', height: '100%' }}
                />
              </Box>
            ) : (
              <Typography sx={{ color: '#0B2D24' }}>Map coming soon.</Typography>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}