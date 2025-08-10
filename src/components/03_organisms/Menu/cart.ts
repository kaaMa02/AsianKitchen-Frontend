import { OrderType } from "../../../types/api-types";

export type CartKind = 'MENU' | 'BUFFET';

export interface CartLine {
  key: string;        // `${kind}:${id}`
  kind: CartKind;
  id: string;         // menuItemId or buffetItemId
  name: string;       // display name
  priceRaw: string;   // BigDecimal string
  priceChf: string;   // formatted for UI
  quantity: number;
}

export interface CartState {
  orderType: OrderType;
  lines: CartLine[];
}
