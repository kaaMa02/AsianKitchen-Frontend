import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "./styles/theme";

import App from "./App";

import { AuthProvider } from "./contexts/AuthContext";
import { RestaurantInfoProvider } from "./contexts/RestaurantInfoContext";
import { CartProvider } from "./contexts/CartContext";
import { ToastProvider } from "./services/toast";

import { ensureCsrf } from "./services/http"; // <-- from the http.ts you updated

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

(async () => {
  try {
    await ensureCsrf();
  } catch {
    // ignore; interceptor will retry on first mutating request
  }

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
})();