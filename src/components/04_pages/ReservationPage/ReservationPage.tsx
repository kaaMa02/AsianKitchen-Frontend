// src/components/04_pages/Reservation/ReservationPage.tsx
import * as React from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, Snackbar, Divider,
} from '@mui/material';
import { createReservation } from '../../../services/reservations';

const AK_DARK = '#0B2D24';
const AK_GOLD = '#D1A01F';
const CARD_BG = '#F4F7FB';

type Errors = Record<string, string>;

/** Local strict types for the form (no optionals) */
type ResAddress = {
  street: string;
  streetNo: string;
  plz: string;
  city: string;
};
type ResCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: ResAddress;
};

const emptyCustomer: ResCustomer = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: { street: '', streetNo: '', plz: '', city: '' }, // harmless if left blank
};

function nowLocalRounded(minutesStep = 5) {
  const d = new Date();
  d.setSeconds(0, 0);
  const ms = minutesStep * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`; // yyyy-MM-ddTHH:mm
}

export default function ReservationPage() {
  const [customer, setCustomer] = React.useState<ResCustomer>(emptyCustomer);
  const [dt, setDt] = React.useState<string>(toLocalInputValue(nowLocalRounded()));
  const [people, setPeople] = React.useState<number>(2);
  const [notes, setNotes] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Errors>({});
  const [error, setError] = React.useState<string>();
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [createdCode, setCreatedCode] = React.useState<string>();

  const handleInput =
    (path: string) =>
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const v = ev.target.value;
      setCustomer((prev): ResCustomer => {
        switch (path) {
          case 'firstName':       return { ...prev, firstName: v };
          case 'lastName':        return { ...prev, lastName: v };
          case 'email':           return { ...prev, email: v };
          case 'phone':           return { ...prev, phone: v };
          case 'address.street':  return { ...prev, address: { ...prev.address, street: v } };
          case 'address.streetNo':return { ...prev, address: { ...prev.address, streetNo: v } };
          case 'address.plz':     return { ...prev, address: { ...prev.address, plz: v } };
          case 'address.city':    return { ...prev, address: { ...prev.address, city: v } };
          default:                return prev;
        }
      });
    };

  const validate = (): Errors => {
    const e: Errors = {};
    const req = (v?: string) => !v || !v.trim();
    if (req(customer.firstName)) e.firstName = 'Required';
    if (req(customer.lastName)) e.lastName = 'Required';
    if (req(customer.email) || !/.+@.+\..+/.test(customer.email)) e.email = 'Valid email required';
    if (req(customer.phone)) e.phone = 'Required';

    if (!dt || isNaN(new Date(dt).getTime())) e.datetime = 'Choose a valid date & time';
    else if (new Date(dt) < new Date()) e.datetime = 'Choose a future time';

    if (!Number.isFinite(people) || people < 1) e.people = 'Must be at least 1';
    return e;
  };

  const onSubmit = async () => {
    try {
      setError(undefined);
      setFieldErrors({});
      const errs = validate();
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setError('Please fix the highlighted fields.');
        return;
      }
      setSubmitting(true);

      // Backend expects LocalDateTime like "YYYY-MM-DDTHH:mm"
      const dto = {
        customerInfo: customer,            // structurally matches your backend CustomerInfoDTO
        reservationDateTime: dt,           // local wall time without timezone
        numberOfPeople: people,
        specialRequests: notes || undefined,
      };

      const created = await createReservation(dto);
      setCreatedCode(created.id);
      setSuccessOpen(true);

      // Optional: reset
      // setCustomer(emptyCustomer);
      // setPeople(2); setNotes(''); setDt(toLocalInputValue(nowLocalRounded()));
    } catch (e: any) {
      const details = e?.response?.data?.details as Record<string, string> | undefined;
      if (details) {
        setFieldErrors(details);
        setError('Please correct the highlighted fields.');
      } else {
        setError('Failed to submit reservation. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#F6F0DE', minHeight: '100vh', py: { xs: 4, md: 6 } }}>
      <Box sx={{ maxWidth: 880, mx: 'auto', px: 2 }}>
        <Typography variant="h4" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
          Book a Table
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 2,
            border: '1px solid rgba(11,45,36,0.12)',
            bgcolor: CARD_BG,
          }}
        >
          <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
            Your details
          </Typography>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <TextField
              label="First name"
              value={customer.firstName}
              onChange={handleInput('firstName')}
              error={!!fieldErrors.firstName}
              helperText={fieldErrors.firstName}
            />
            <TextField
              label="Last name"
              value={customer.lastName}
              onChange={handleInput('lastName')}
              error={!!fieldErrors.lastName}
              helperText={fieldErrors.lastName}
            />
            <TextField
              label="Email"
              type="email"
              value={customer.email}
              onChange={handleInput('email')}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />
            <TextField
              label="Phone"
              value={customer.phone}
              onChange={handleInput('phone')}
              error={!!fieldErrors.phone}
              helperText={fieldErrors.phone}
            />

            {/* Optional address block */}
            <TextField
              label="Street"
              value={customer.address.street}
              onChange={handleInput('address.street')}
              sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
            />
            <TextField
              label="No."
              value={customer.address.streetNo}
              onChange={handleInput('address.streetNo')}
            />
            <TextField
              label="PLZ"
              value={customer.address.plz}
              onChange={handleInput('address.plz')}
            />
            <TextField
              label="City"
              value={customer.address.city}
              onChange={handleInput('address.city')}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
            Reservation
          </Typography>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <TextField
              label="Date & time"
              type="datetime-local"
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              error={!!fieldErrors.datetime}
              helperText={fieldErrors.datetime}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Number of people"
              type="number"
              inputProps={{ min: 1, max: 20 }}
              value={people}
              onChange={(e) => setPeople(Math.max(1, parseInt(e.target.value || '1', 10)))}
              error={!!fieldErrors.people}
              helperText={fieldErrors.people}
            />
            <TextField
              label="Special requests (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={3}
              sx={{ gridColumn: { xs: '1 / -1' } }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            <Button variant="outlined" href="/#contact">
              Contact us
            </Button>
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={submitting}
              sx={{
                bgcolor: AK_GOLD,
                color: AK_DARK,
                fontWeight: 800,
                '&:hover': { bgcolor: '#E2B437' },
              }}
            >
              {submitting ? 'Sending…' : 'Request reservation'}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={8000}
        message="Reservation request sent! We’ll email you when it’s confirmed."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      {createdCode && (
        <Box sx={{ mt: 2, textAlign: 'center', color: AK_DARK }}>
          <Typography sx={{ opacity: 0.8 }}>
            Your tracking code: <strong>{createdCode}</strong> (check your email)
          </Typography>
        </Box>
      )}
    </Box>
  );
}
