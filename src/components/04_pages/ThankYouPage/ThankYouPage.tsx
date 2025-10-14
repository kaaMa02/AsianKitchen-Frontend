import { Box, Paper, Typography, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function ThankYouPage() {
  return (
    <Box sx={{ p: 3, display: "grid", placeItems: "center", minHeight: "70vh" }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: "1px solid rgba(11,45,36,.12)", maxWidth: 560, textAlign: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0B2D24", mb: 1 }}>
          Successfully ordered 🎉
        </Typography>
        <Typography sx={{ color: "#0B2D24", opacity: 0.9 }}>
          Thanks for your order! A confirmation email is on its way.
        </Typography>
        <Button component={RouterLink} to="/menu" variant="contained" sx={{ mt: 3 }}>
          Back to menu
        </Button>
      </Paper>
    </Box>
  );
}
