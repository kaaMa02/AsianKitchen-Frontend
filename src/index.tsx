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

// Prime CSRF cookie once on boot (non-blocking)
ensureCsrf().catch(() => {});

const theme = createTheme();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
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
