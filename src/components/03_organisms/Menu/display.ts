import { BigDecimal, MenuItemCategory, UUID } from "../../../types/api-types";

export interface DisplayItem {
  id: UUID;                 // menuItemId
  foodItemId: UUID;
  foodItemName: string;
  description?: string;
  priceRaw: BigDecimal;
  priceChf: string;
  category: MenuItemCategory;
  categoryLabel: string;
  available: boolean;
}

export interface BuffetDisplayItem {
  id: UUID;                 // buffetItemId
  foodItemId: UUID;
  foodItemName: string;
  priceRaw: BigDecimal;
  priceChf: string;
  available: boolean;
}
