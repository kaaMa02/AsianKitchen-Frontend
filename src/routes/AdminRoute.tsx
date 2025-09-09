// src/components/04_pages/Admin/_common/AdminRoute.tsx
import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Props = { children: React.ReactNode };

export default function AdminRoute({ children }: Props) {
  const { role } = useAuth();
  const loc = useLocation();

  if (role !== 'ADMIN') {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}
        replace
      />
    );
  }
  return <>{children}</>;
}
