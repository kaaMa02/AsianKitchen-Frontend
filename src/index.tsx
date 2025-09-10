import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { RestaurantInfoProvider } from "./contexts/RestaurantInfoContext";
import { CartProvider } from "./contexts/CartContext";
import { ToastProvider } from "./services/toast";
import { ensureCsrf } from "./services/http";

// Kick off CSRF cookie (fire-and-forget)
ensureCsrf().catch(() => { /* ignore; first write will retry */ });

const theme = createTheme();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <AuthProvider>
        <RestaurantInfoProvider>
          <CartProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </CartProvider>
        </RestaurantInfoProvider>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);
