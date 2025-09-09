// src/components/04_pages/Auth/LoginPage.tsx
import * as React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Paper, TextField, Typography, Button, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const AK_DARK = '#0B2D24';
const AK_GOLD = '#D1A01F';

export default function LoginPage() {
  const { login } = useAuth();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string>();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    setBusy(true);
    try {
      await login(username, password);
      const next = search.get('next') || '/admin';
      navigate(next, { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#F6F0DE', minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #E2D9C2', maxWidth: 420, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: AK_DARK, mb: 2 }}>
          Admin Login
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Box component="form" onSubmit={onSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            fullWidth
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            required
          />
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            sx={{ bgcolor: AK_GOLD, color: AK_DARK, fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
