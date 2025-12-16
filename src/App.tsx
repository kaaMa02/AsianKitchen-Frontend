import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import Navbar from "./components/02_molecules/NavBar";
import Footer from "./components/03_organisms/Home/Footer";
import ErrorBoundary from "./components/common/ErrorBoundary";
import PageLoader from "./components/common/PageLoader";
import ScrollToHash from "./components/common/ScrollToHash";

import CheckoutPage from "./components/04_pages/CheckoutPage/CheckoutPage";
import ReservationPage from "./components/04_pages/ReservationPage/ReservationPage";
import BuffetItemsAdminPage from "./components/04_pages/Admin/BuffetItemsAdminPage";
import BuffetOrdersAdminPage from "./components/04_pages/Admin/BuffetOrdersAdminPage";
import FoodItemsAdminPage from "./components/04_pages/Admin/FoodItemsAdminPage";
import AdminLayout from "./components/04_pages/Admin/layout/AdminLayout";
import MenuItemsAdminPage from "./components/04_pages/Admin/MenuItemsAdminPage";
import ReservationsAdminPage from "./components/04_pages/Admin/ReservationsAdminPage";
import RestaurantInfoAdminPage from "./components/04_pages/Admin/RestaurantInfoAdminPage";
import UsersAdminPage from "./components/04_pages/Admin/UsersAdminPage";
import LoginPage from "./components/04_pages/Auth/LoginPage";
import AdminRoute from "./routes/AdminRoute";
import OrdersAdminPage from "./components/04_pages/Admin/CustomerOrdersAdminPage";

import { bootstrapCsrf } from "./services/http";
import { AdminAlertsProvider } from "./contexts/AdminAlertsContext";
import DiscountsPage from "./components/04_pages/Admin/DiscountsPage";
import ThankYouPage from "./components/04_pages/ThankYouPage/ThankYouPage";
import TrackBuffetOrderPage from "./components/04_pages/TrackOrderPage/TrackBuffetOrderPage";
import TrackMenuOrderPage from "./components/04_pages/TrackOrderPage/TrackMenuOrderPage";
import AdminIncomingPage from "./components/04_pages/Admin/AdminIncomingPage";
import { GF_ORDER_URL, GF_RESERVATION_URL } from "./config/gloriafood";

const HomePage = lazy(() => import("./components/04_pages/HomePage/HomePage"));
const MenuPage = lazy(() => import("./components/04_pages/MenuPage/MenuPage"));

export default function App() {
  const loc = useLocation();
  useEffect(() => {
    bootstrapCsrf().catch(() => {});
  }, []);

  const isAdmin = loc.pathname.startsWith("/admin");

  return (
    <ErrorBoundary fallback={<PageLoader />}>
      {!isAdmin && <Navbar />}
      {!isAdmin && <Box sx={{ height: { xs: 56, md: 64 } }} />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={GF_ORDER_URL} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/reservation" element={GF_RESERVATION_URL} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/track" element={<TrackMenuOrderPage />} />
          <Route path="/track-buffet" element={<TrackBuffetOrderPage />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminAlertsProvider>
                  <AdminLayout />
                </AdminAlertsProvider>
              </AdminRoute>
            }
          >
            <Route index element={<AdminIncomingPage />} />
            <Route path="incoming" element={<AdminIncomingPage />} />
            <Route path="discounts" element={<DiscountsPage />} />
            <Route path="reservations" element={<ReservationsAdminPage />} />
            <Route path="orders" element={<OrdersAdminPage />} />
            <Route path="buffet-orders" element={<BuffetOrdersAdminPage />} />
            <Route path="food-items" element={<FoodItemsAdminPage />} />
            <Route path="menu-items" element={<MenuItemsAdminPage />} />
            <Route path="buffet-items" element={<BuffetItemsAdminPage />} />
            <Route path="restaurant-info" element={<RestaurantInfoAdminPage />} />
            <Route path="users" element={<UsersAdminPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <ScrollToHash />
      {!isAdmin && <Footer />}
    </ErrorBoundary>
  );
}
