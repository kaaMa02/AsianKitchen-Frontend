// src/components/common/AdminRoute.tsx
import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Props = { children: React.ReactElement };

export default function AdminRoute({ children }: Props) {
  const { role } = useAuth();
  const location = useLocation();

  if (role !== 'ADMIN') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}
