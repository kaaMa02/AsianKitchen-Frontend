import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './styles/theme';

import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { RestaurantInfoProvider } from './contexts/RestaurantInfoContext';
import { CartProvider } from './contexts/CartContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <AuthProvider>
        <RestaurantInfoProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </RestaurantInfoProvider>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);
