// src/components/04_pages/MenuPage/MenuPage.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
import MuiContainer from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useSearchParams } from 'react-router-dom';

import { listAvailableMenuItems } from '../../../services/menuItems';
import { listPublicFoodItems } from '../../../services/foodItems';
import { listAvailableBuffetItems } from '../../../services/buffetItems';

import {
  FoodItemDTO,
  MenuItemDTO,
  BuffetItemReadDTO,
  OrderType,
} from '../../../types/api-types';

import {
  buildMenuDisplay,
  buildBuffetDisplay,
  groupByCategory,
} from '../../../utils/buildDisplay';

import MenuList from '../../03_organisms/Menu/MenuList';
import BuffetList from '../../03_organisms/Menu/BuffetList';
import { useCart } from '../../../contexts/CartContext';
import CartDrawer from '../../02_molecules/Menu/CartDrawer';

export default function MenuPage() {
  const [searchParams] = useSearchParams();

  const [tab, setTab] = React.useState(0);
  const [menuGroups, setMenuGroups] = React.useState<
    { category: string; categoryLabel: string; items: any[] }[]
  >([]);
  const [buffetItems, setBuffetItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawer, setDrawer] = React.useState(false);

  const { addOrInc, state, setOrderType, count, total } = useCart();

  // Initialize from query string using the enum
  React.useEffect(() => {
    const t = (searchParams.get('type') || '').toLowerCase();
    if (t === 'delivery') setOrderType(OrderType.DELIVERY);
    if (t === 'takeaway') setOrderType(OrderType.TAKEAWAY);

    const qTab = (searchParams.get('tab') || '').toLowerCase();
    if (qTab === 'buffet') setTab(1);
    if (qTab === 'menu' || qTab === 'a-la-carte') setTab(0);
  }, [searchParams, setOrderType]);

  // Load data
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [menu, buffet, food]: [MenuItemDTO[], BuffetItemReadDTO[], FoodItemDTO[]] =
          await Promise.all([
            listAvailableMenuItems(),
            listAvailableBuffetItems(),
            listPublicFoodItems(),
          ]);

        const foodById = Object.fromEntries(food.map((f) => [String(f.id), f]));
        const menuDisplay = buildMenuDisplay(menu, foodById);
        const buffetDisplay = buildBuffetDisplay(buffet, foodById);

        setMenuGroups(groupByCategory(menuDisplay));
        setBuffetItems(buffetDisplay);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // handlers for Add buttons
  const onAddMenu = (it: any) => {
    addOrInc({
      kind: 'MENU',
      id: it.id,
      name: it.foodItemName,
      priceRaw: it.priceRaw,
      priceChf: it.priceChf,
    });
  };

  const onAddBuffet = (it: any) => {
    addOrInc({
      kind: 'BUFFET',
      id: it.id,
      name: it.foodItemName,
      priceRaw: it.priceRaw,
      priceChf: it.priceChf,
    });
  };

  const handleOrderType = (_: unknown, val: OrderType | null) => {
    if (val) setOrderType(val);
  };

  return (
    <Box sx={{ bgcolor: '#F6F0DE', minHeight: '100vh' }}>
      {/* Top band like hero */}
      <Box sx={{ bgcolor: '#0B2D24', color: '#EFE7CE', py: { xs: 6, md: 8 }, mb: { xs: 4, md: 6 } }}>
        <MuiContainer maxWidth="xl">
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            Our Menu
          </Typography>
          <Typography sx={{ opacity: 0.9, mt: 0.75 }}>
            Fresh sushi & warm Thai favorites — pick your mood.
          </Typography>
        </MuiContainer>
      </Box>

      <MuiContainer maxWidth="xl" sx={{ pb: { xs: 8, md: 12 } }}>
        {/* Controls row */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            mb: { xs: 2, md: 3 },
            flexWrap: 'wrap',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            textColor="inherit"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': { color: '#0B2D24', fontWeight: 800 },
            }}
          >
            <Tab label="À la carte" />
            <Tab label="Buffet" />
          </Tabs>

          <Box sx={{ flex: 1 }} />

          <ToggleButtonGroup
            value={state.orderType}
            exclusive
            onChange={handleOrderType}
            size="small"
          >
            <ToggleButton value={OrderType.TAKEAWAY}>Takeaway</ToggleButton>
            <ToggleButton value={OrderType.DELIVERY}>Delivery</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            onClick={() => setDrawer(true)}
            startIcon={<ShoppingCartIcon />}
            disabled={count === 0}
            sx={{
              bgcolor: '#C88C1A',
              color: '#F6F0DE',
              '&:hover': { bgcolor: '#C88C1A', opacity: 0.95 },
            }}
          >
            Cart ({count}) · CHF {total.toFixed(2)}
          </Button>
        </Box>

        {loading ? (
          <Typography sx={{ color: '#0B2D24' }}>Loading…</Typography>
        ) : tab === 0 ? (
          <MenuList groups={menuGroups} onAdd={onAddMenu} />
        ) : (
          <BuffetList items={buffetItems} onAdd={onAddBuffet} />
        )}
      </MuiContainer>

      <CartDrawer open={drawer} onClose={() => setDrawer(false)} />
    </Box>
  );
}
