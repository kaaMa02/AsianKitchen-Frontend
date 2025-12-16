import Box from "@mui/material/Box";
import MuiContainer from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import AKButton from "../../01_atoms/AKButton";
import { GF_ORDER_URL, GF_RESERVATION_URL } from "../../../config/gloriafood";

const NAV_H_XS = 56;
const NAV_H_MD = 64;

export default function HeroSection() {
  return (
    <Box
      component="header"
      sx={{
        minHeight: {
          xs: `calc(100vh - ${NAV_H_XS}px)`,
          md: `calc(100vh - ${NAV_H_MD}px)`,
        },
        pt: { xs: `${NAV_H_XS}px`, md: `${NAV_H_MD}px` },
        bgcolor: "#0B2D24",
        display: "flex",
        alignItems: "center",
      }}
    >
      <MuiContainer maxWidth="xl" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ maxWidth: { xs: "100%", md: 820 } }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{ color: "#EFE7CE", fontWeight: 500, lineHeight: 1.1 }}
          >
            Welcome to
          </Typography>

          <Typography
            component="h2"
            sx={{
              color: "#EFE7CE",
              fontSize: { xs: 42, md: 68 },
              fontWeight: 800,
              letterSpacing: "-0.02em",
              mt: 1.5,
              minHeight: "1.2em",
            }}
          >
            Asian Kitchen
          </Typography>

          {/* Primary CTAs */}
          <Box
            sx={{
              mt: { xs: 4.5, md: 6 },
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, max-content)" },
              gap: 2,
              width: "100%",
            }}
          >
            <AKButton asLinkHref={GF_ORDER_URL}>Menu & Bestellung</AKButton>
            <AKButton asLinkHref={GF_RESERVATION_URL}>Book a Table</AKButton>
          </Box>
        </Box>
      </MuiContainer>
    </Box>
  );
}
