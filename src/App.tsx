import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";

import Navbar from "./components/02_molecules/NavBar";
import Footer from "./components/03_organisms/Home/Footer";

import { RestaurantInfoProvider } from "./contexts/RestaurantInfoContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";

import ErrorBoundary from "./components/common/ErrorBoundary";
import PageLoader from "./components/common/PageLoader";
import { ToastProvider } from "./services/toast";
import ScrollToHash from "./components/common/ScrollToHash";

import CheckoutPage from "./components/04_pages/CheckoutPage/CheckoutPage";
import ReservationPage from "./components/04_pages/ReservationPage/ReservationPage";
import AdminDashboardPage from "./components/04_pages/Admin/DashboardPage";
import AdminLayout from "./components/04_pages/Admin/layout/AdminLayout";
import ReservationsAdminPage from "./components/04_pages/Admin/ReservationsAdminPage";
import LoginPage from "./components/04_pages/LoginPage";
import AdminRoute from "./routes/AdminRoute";

// lazy public pages
const HomePage = lazy(() => import("./components/04_pages/HomePage/HomePage"));
const MenuPage = lazy(() => import("./components/04_pages/MenuPage/MenuPage"));

function PublicShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith("/admin");
  const isLogin = loc.pathname === "/login";
  return (
    <>
      {!isAdmin && !isLogin && <Navbar />}
      {!isAdmin && !isLogin && <Box sx={{ height: { xs: 56, md: 64 } }} />}
      {children}
      {!isAdmin && !isLogin && <ScrollToHash />}
      {!isAdmin && !isLogin && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RestaurantInfoProvider>
          <CartProvider>
            <CssBaseline />
            <ErrorBoundary fallback={<PageLoader />}>
              <PublicShell>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/menu" element={<MenuPage />} />
                    <Route path="/reservation" element={<ReservationPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Admin (guarded & nested under /admin) */}
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboardPage />} />
                        <Route path="reservations" element={<ReservationsAdminPage />} />
                        {/* Add other admin pages here: */}
                        {/* <Route path="menu-items" element={<MenuItemsAdminPage />} /> */}
                        {/* <Route path="restaurant-info" element={<RestaurantInfoAdminPage />} /> */}
                        {/* etc. */}
                      </Route>
                    </Route>

                    {/* Catch-all -> public home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </PublicShell>
            </ErrorBoundary>
          </CartProvider>
        </RestaurantInfoProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
