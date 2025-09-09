import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { useRestaurantInfoCtx } from '../../../contexts/RestaurantInfoContext';

const cardSx = {
  bgcolor: '#f5efdf',
  border: '1px solid #E2D9C2',
  borderRadius: 0.5,
  p: { xs: 3, md: 4 },
} as const;

function formatChf(n: number) {
  return `CHF ${n.toFixed(2)}`;
}

const FEE_RULES = [
  { color: '#F0802A', label: 'Up to CHF 25.00', fee: 0 },
  { color: '#3BB9A3', label: 'Over CHF 25.00 and under CHF 50.00', fee: 3.00 },
  { color: '#E6A91A', label: 'Over CHF 50.00', fee: 5.00 },
];

function parseOpeningHours(src: string) {
  return src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [day, ...rest] = l.split(':');
      return { day: (day ?? '').trim(), text: rest.join(':').trim() };
    });
}

export default function InfoCard() {
  const { info } = useRestaurantInfoCtx();
  const hours = parseOpeningHours(info?.openingHours ?? '');

  return (
    <Paper id="hours" elevation={0} sx={cardSx}>
      {/* Opening hours */}
      <Typography variant="h5" sx={{ color: '#0B2D24', fontWeight: 800, mb: 1.5 }}>
        <span role="img" aria-label="opening-hours">🕒</span>{' '}
        Opening hours
      </Typography>

      {hours.length === 0 ? (
        <Typography sx={{ color: '#0B2D24' }}>Hours coming soon.</Typography>
      ) : (
        <Box
          component="ul"
          sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}
        >
          {hours.map(({ day, text }, i) => (
            <Box key={i} component="li" sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
              <Typography component="span" sx={{ color: '#0B2D24', fontWeight: 700, minWidth: 120 }}>
                {day}:
              </Typography>
              <Typography component="span" sx={{ color: '#0B2D24', fontSize: { xs: 16, md: 18 }, lineHeight: 1.7 }}>
                {text}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Divider-ish space */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(11,45,36,0.08)' }} />

      {/* Delivery fees */}
      <Typography variant="h5" sx={{ color: '#0B2D24', fontWeight: 800, mb: 1.5 }}>
        <span role="img" aria-label="delivery">🚚</span>{' '}
        Delivery fees (Delivery orders only)
      </Typography>

      <List disablePadding>
        {FEE_RULES.map((row, idx) => (
          <ListItem key={idx} disableGutters sx={{ gap: 1.5, py: 0.75 }}>
            <Box
              sx={{
                width: 12, height: 12, borderRadius: '50%',
                bgcolor: row.color, flex: '0 0 auto', mt: '2px'
              }}
            />
            <ListItemText
              primary={
                <Typography sx={{ color: '#0B2D24', fontSize: { xs: 16, md: 18 } }}>
                  {row.label} — Fee {formatChf(row.fee)}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
