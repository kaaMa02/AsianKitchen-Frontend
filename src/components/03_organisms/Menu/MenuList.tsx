// src/components/03_organisms/Menu/MenuList.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { DisplayItem } from './display';

type Props = {
  groups: { category: string; categoryLabel: string; items: DisplayItem[] }[];
  onAdd?: (item: DisplayItem) => void;
};

const emojiByCategory: Record<string, string> = {
  SUSHI_STARTER: '🍥',      
  SUSHI_ROLLS: '🍣',        
  HOSO_MAKI: '🍣',          
  NIGIRI: '🍣',
  TEMAKI: '🥢',             
  SUSHI_PLATTEN: '🍱',      

  BOWLS: '🥗',
  DONBURI: '🍚',
  RAMEN_NOODLE: '🍜',

  THAI_STARTER: '🥟',
  THAI_SUPPE: '🍲',
  THAI_NOODLES: '🍜',
  THAI_CURRY: '🍛',
  THAI_WOK: '🥘',

  SIDES: '🧂',
  DESSERT: '🍰',
  DRINK: '🍹',
};
const getCategoryEmoji = (c: string) => emojiByCategory[c] ?? '🍽️';

export default function MenuList({ groups, onAdd }: Props) {
  return (
    <Box sx={{ py: { xs: 2, md: 4 }, bgcolor: 'transparent' }}>
      {groups.map((g) => (
        <Box key={g.category} sx={{ mb: { xs: 6, md: 8 } }}>
          {/* Emoji + title aligned on one line */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1.25,
              fontSize: { xs: 30, md: 40 },
              lineHeight: 1.15,
              mb: { xs: 2, md: 3 },
            }}
          >
            <Box
              component="span"
              aria-hidden
              title={g.categoryLabel}
              sx={{ fontSize: '1.1em', lineHeight: 1 }}
            >
              {getCategoryEmoji(g.category)}
            </Box>

            <Typography
              component="h2"
              sx={{
                fontSize: 'inherit',
                color: '#0B2D24',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                lineHeight: 'inherit',
                m: 0,
              }}
            >
              {g.categoryLabel}
            </Typography>
          </Box>

          {/* Content area on your beige page — centered, no box */}
          <Box sx={{ maxWidth: 960, mx: 'auto' }}>
            {g.items.map((it, idx) => {
              const disabled = !it.available;
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
                    <Box>
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
                      {it.description && (
                        <Typography
                          sx={{
                            color: '#0B2D24',
                            opacity: 0.85,
                            mt: 0.25,
                            fontSize: { xs: 14, md: 15.5 },
                          }}
                        >
                          {it.description}
                        </Typography>
                      )}
                    </Box>

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

                  {idx < g.items.length - 1 && (
                    <Divider sx={{ borderColor: 'rgba(11,45,36,.18)' }} />
                  )}
                </React.Fragment>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
