import * as React from 'react';
import { OrderType } from '../types/api-types';
import { CartLine, CartState } from '../components/03_organisms/Menu/cart';

type Ctx = {
  state: CartState;
  addOrInc: (line: Omit<CartLine, 'quantity' | 'key'>, qty?: number) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOrderType: (t: OrderType) => void;
  total: number;
  count: number;
};

const CartContext = React.createContext<Ctx | undefined>(undefined);
const STORAGE_KEY = 'ak_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<CartState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const ot = parsed?.orderType === OrderType.DELIVERY ? OrderType.DELIVERY : OrderType.TAKEAWAY;
        return { ...parsed, orderType: ot };
      }
    } catch {}
    return { orderType: OrderType.TAKEAWAY, lines: [] as CartLine[] };
  });

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addOrInc = (line: Omit<CartLine, 'quantity' | 'key'>, qty = 1) => {
    const key = `${line.kind}:${line.id}`;
    setState((s) => {
      const exist = s.lines.find((l) => l.key === key);
      if (exist) {
        return {
          ...s,
          lines: s.lines.map((l) =>
            l.key === key ? { ...l, quantity: l.quantity + qty } : l
          ),
        };
      }
      const newLine: CartLine = { ...line, key, quantity: qty };
      return { ...s, lines: [...s.lines, newLine] };
    });
  };

  const inc = (key: string) =>
    setState((s) => ({ ...s, lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)) }));

  const dec = (key: string) =>
    setState((s) => ({
      ...s,
      lines: s.lines
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    }));

  const remove = (key: string) =>
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) }));

  const clear = () => setState((s) => ({ ...s, lines: [] }));

  const setOrderType = (t: OrderType) => setState((s) => ({ ...s, orderType: t }));

  const total = state.lines.reduce((sum, l) => sum + Number(l.priceRaw) * l.quantity, 0);
  const count = state.lines.reduce((sum, l) => sum + l.quantity, 0);

  const value: Ctx = { state, addOrInc, inc, dec, remove, clear, setOrderType, total, count };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
