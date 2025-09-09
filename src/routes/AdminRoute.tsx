// src/components/common/AdminRoute.tsx
import * as React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute() {
  const { role } = useAuth();
  const loc = useLocation();

  // treat any role that includes 'ADMIN' as admin
  const isAdmin = !!role && role.toUpperCase().includes('ADMIN');

  if (!isAdmin) {
    const next = encodeURIComponent(loc.pathname + loc.search + loc.hash);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // render nested /admin/* routes
  return <Outlet />;
}
