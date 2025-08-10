// src/components/03_organisms/Menu/BuffetList.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { BuffetDisplayItem } from './display';

type Props = { items: BuffetDisplayItem[]; onAdd?: (item: BuffetDisplayItem) => void };

export default function BuffetList({ items, onAdd }: Props) {
  if (items.length === 0) {
    return <Typography sx={{ color: '#0B2D24' }}>Buffet selection coming soon.</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', bgcolor: 'transparent' }}>
      {items.map((it, idx) => {
        const disabled = false;
        return (
          <React.Fragment key={it.id}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr auto auto', md: '1fr auto auto' },
                gap: { xs: 1.5, md: 2 },
                alignItems: 'center',
                px: { xs: 0.5, md: 0 },
                py: { xs: 1.2, md: 1.35 },
              }}
            >
              <Typography
                sx={{
                  color: '#0B2D24',
                  fontWeight: 700,
                  fontSize: { xs: 18, md: 20 },
                  lineHeight: 1.35,
                }}
              >
                {it.foodItemName}
              </Typography>

              <Typography
                sx={{
                  color: '#0B2D24',
                  fontWeight: 700,
                  fontSize: { xs: 16, md: 18 },
                  textAlign: 'right',
                  minWidth: { md: 92 },
                }}
              >
                {it.priceChf}
              </Typography>

              <IconButton
                onClick={() => onAdd?.(it)}
                disabled={disabled}
                size="small"
                aria-label={`Add ${it.foodItemName}`}
                sx={{
                  ml: 0.5,
                  bgcolor: disabled ? 'rgba(200,140,26,.3)' : '#C88C1A',
                  color: '#F6F0DE',
                  '&:hover': { bgcolor: '#C88C1A', opacity: 0.95 },
                  width: 34,
                  height: 34,
                }}
              >
                <AddRoundedIcon fontSize="small" />
              </IconButton>
            </Box>

            {idx < items.length - 1 && (
              <Divider sx={{ borderColor: 'rgba(11,45,36,.18)' }} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
