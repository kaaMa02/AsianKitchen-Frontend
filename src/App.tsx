import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";

import Navbar from "./components/02_molecules/NavBar";
import Footer from "./components/03_organisms/Home/Footer";

import { RestaurantInfoProvider } from "./contexts/RestaurantInfoContext";
import { CartProvider } from "./contexts/CartContext";

import ErrorBoundary from "./components/common/ErrorBoundary";
import PageLoader from "./components/common/PageLoader";
import { ToastProvider } from "./services/toast";
import ScrollToHash from "./components/common/ScrollToHash";
import CheckoutPage from "./components/04_pages/CheckoutPage/CheckoutPage";
import ReservationsAdminPage from "./components/04_pages/Admin/ReservationsAdminPage";
import ReservationPage from "./components/04_pages/ReservationPage/ReservationPage";

// lazy-load pages (enables Suspense fallback)
const HomePage = lazy(() => import("./components/04_pages/HomePage/HomePage"));
const MenuPage = lazy(() => import("./components/04_pages/MenuPage/MenuPage"));

export default function App() {
  return (
    <ToastProvider>
      <RestaurantInfoProvider>
        <CartProvider>
          <CssBaseline />

          <ErrorBoundary fallback={<PageLoader />}>
            <Navbar />
            {/* spacer for fixed navbar */}
            <Box sx={{ height: { xs: 56, md: 64 } }} />

            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/reservation" element={<ReservationPage />} />
                <Route
                  path="/admin/reservations"
                  element={<ReservationsAdminPage />}
                />
              </Routes>
            </Suspense>

            <ScrollToHash />
            <Footer />
          </ErrorBoundary>
        </CartProvider>
      </RestaurantInfoProvider>
    </ToastProvider>
  );
}
