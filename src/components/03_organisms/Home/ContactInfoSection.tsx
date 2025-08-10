import Box from '@mui/material/Box';
import MuiContainer from '@mui/material/Container';
import ContactCard from '../../02_molecules/Home/ContactCard';
import InfoCard from '../../02_molecules/Home/InfoCard';
import { colors } from '../../../styles/theme';

const NAV_H_XS = 56; // match your Navbar
const NAV_H_MD = 64;

export default function ContactInfoSection() {
  return (
    <Box component="section" sx={{ bgcolor: colors.beigePale, py: { xs: 10, md: 14 } }}>
      <MuiContainer maxWidth="xl">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 6, md: 8 },
            alignItems: 'start',
          }}
        >
          {/* Contact card (anchor target) */}
          <Box id="contact" sx={{ scrollMarginTop: { xs: NAV_H_XS, md: NAV_H_MD } }}>
            <ContactCard />
          </Box>

          {/* Info card (anchor target) */}
          <Box id="info" sx={{ scrollMarginTop: { xs: NAV_H_XS, md: NAV_H_MD } }}>
            <InfoCard />
          </Box>
        </Box>
      </MuiContainer>
    </Box>
  );
}
