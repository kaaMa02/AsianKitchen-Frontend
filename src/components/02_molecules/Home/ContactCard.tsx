import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AKButton from '../../01_atoms/AKButton';
import { sendContactMessage } from '../../../services/contactMessages';

const cardSx = {
  bgcolor: '#f5efdf',                     // a bit darker than section bg
  border: '1px solid #E2D9C2',
  borderRadius: 0.5,
  p: { xs: 3, md: 4 },
} as const;

export default function ContactCard() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [snack, setSnack] = React.useState<{ open: boolean; ok?: boolean; msg: string }>({
    open: false, msg: '',
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sendContactMessage({ name, email, phone: phone || undefined, message });
      setSnack({ open: true, ok: true, msg: 'Message sent. We will get back to you soon.' });
      setName(''); setEmail(''); setPhone(''); setMessage('');
    } catch (err: any) {
      setSnack({ open: true, ok: false, msg: err?.response?.data?.message || 'Failed to send message' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper elevation={0} sx={cardSx}>
      <Typography variant="h3" sx={{ color: '#0B2D24', fontWeight: 800, mb: 3 }}>
        <span role="img" aria-label="contact">✉️</span>{' '}
        Contact us
      </Typography>

      <Box component="form" onSubmit={onSubmit} sx={{ display: 'grid', gap: 2 }}>
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
        <TextField label="Message" required value={message} onChange={(e) => setMessage(e.target.value)} fullWidth minRows={4} multiline />
        <Box sx={{ mt: 0.5 }}>
          <AKButton type="submit" dense disabled={submitting} sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: 200 } }}>
            {submitting ? 'Sending…' : 'Send message'}
          </AKButton>
        </Box>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.ok ? 'success' : 'error'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
