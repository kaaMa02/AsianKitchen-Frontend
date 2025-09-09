import * as React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Role } from '../types/api-types';

export default function AdminRoute() {
  const { role, loading } = useContext(AuthContext);
  const loc = useLocation();
  if (loading) return null;
  if (role !== Role.ADMIN) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}
