// src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

import Navbar from './components/02_molecules/NavBar';
import Footer from './components/03_organisms/Home/Footer';

import { RestaurantInfoProvider } from './contexts/RestaurantInfoContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';

import ErrorBoundary from './components/common/ErrorBoundary';
import PageLoader from './components/common/PageLoader';
import ScrollToHash from './components/common/ScrollToHash';

import CheckoutPage from './components/04_pages/CheckoutPage/CheckoutPage';
import ReservationPage from './components/04_pages/ReservationPage/ReservationPage';
import AdminLayout from './components/04_pages/Admin/layout/AdminLayout';
import AdminRoute from './routes/AdminRoute';

// lazy
const HomePage = lazy(() => import('./components/04_pages/HomePage/HomePage'));
const MenuPage = lazy(() => import('./components/04_pages/MenuPage/MenuPage'));
const LoginPage = lazy(() => import('./components/04_pages/LoginPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./components/04_pages/Admin/DashboardPage'));
const ReservationsAdminPage = lazy(() => import('./components/04_pages/Admin/ReservationsAdminPage'));
const FoodItemsAdminPage = lazy(() => import('./components/04_pages/Admin/FoodItemsAdminPage'));
const MenuItemsAdminPage = lazy(() => import('./components/04_pages/Admin/MenuItemsAdminPage'));
const BuffetItemsAdminPage = lazy(() => import('./components/04_pages/Admin/BuffetItemsAdminPage'));
const RestaurantInfoAdminPage = lazy(() => import('./components/04_pages/Admin/RestaurantInfoAdminPage'));
const UsersAdminPage = lazy(() => import('./components/04_pages/Admin/UsersAdminPage'));
const OrdersAdminPage = lazy(() => import('./components/04_pages/Admin/OrdersAdminPage'));
const BuffetOrdersAdminPage = lazy(() => import('./components/04_pages/Admin/BuffetOrdersAdminPage'));

export default function App() {
  return (
    <AuthProvider>
      <RestaurantInfoProvider>
        <CartProvider>
          <CssBaseline />
          <ErrorBoundary fallback={<PageLoader />}>
            <Navbar />
            <Box sx={{ height: { xs: 56, md: 64 } }} />

            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* public */}
                <Route path="/" element={<HomePage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/reservation" element={<ReservationPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* admin */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="reservations" element={<ReservationsAdminPage />} />
                  <Route path="food-items" element={<FoodItemsAdminPage />} />
                  <Route path="menu-items" element={<MenuItemsAdminPage />} />
                  <Route path="buffet-items" element={<BuffetItemsAdminPage />} />
                  <Route path="orders" element={<OrdersAdminPage />} />
                  <Route path="buffet-orders" element={<BuffetOrdersAdminPage />} />
                  <Route path="restaurant" element={<RestaurantInfoAdminPage />} />
                  <Route path="users" element={<UsersAdminPage />} />
                  {/* unknown /admin -> dashboard */}
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>

                {/* unknown public -> home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>

            <ScrollToHash />
            <Footer />
          </ErrorBoundary>
        </CartProvider>
      </RestaurantInfoProvider>
    </AuthProvider>
  );
}