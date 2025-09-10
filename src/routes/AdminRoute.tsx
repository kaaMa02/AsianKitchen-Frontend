import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/api-types';

type Props = { children: React.ReactNode };

export default function AdminRoute({ children }: Props) {
  const { role, ready } = useAuth();
  const loc = useLocation();

  if (!ready) {
    return (
      <Box sx={{ p: 6, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (role !== Role.ADMIN) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
