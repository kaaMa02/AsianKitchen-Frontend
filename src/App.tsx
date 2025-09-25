import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import AdminDashboardPage from "./components/04_pages/Admin/AdminDashboardPage";
import OrdersAdminPage from "./components/04_pages/Admin/CustomerOrdersAdminPage";

import { bootstrapCsrf } from "./services/http";

const HomePage = lazy(() => import("./components/04_pages/HomePage/HomePage"));
const MenuPage = lazy(() => import("./components/04_pages/MenuPage/MenuPage"));

export default function App() {
  useEffect(() => {
    bootstrapCsrf().catch(() => {});
  }, []);

  return (
    <ErrorBoundary fallback={<PageLoader />}>
      <Navbar />
      <Box sx={{ height: { xs: 56, md: 64 } }} />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/reservation" element={<ReservationPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin (guarded) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
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
      <Footer />
    </ErrorBoundary>
  );
}
