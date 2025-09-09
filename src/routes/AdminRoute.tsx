// src/components/routes/AdminRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <Box sx={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (role !== 'ROLE_ADMIN') {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}
