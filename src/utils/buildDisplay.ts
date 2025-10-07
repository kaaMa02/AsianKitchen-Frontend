import { BuffetDisplayItem, DisplayItem } from '../components/03_organisms/Menu/display';
import {
  FoodItemDTO,
  MenuItemDTO,
  BuffetItemReadDTO,
  MenuItemCategory,
} from '../types/api-types';
import { categoryLabel, formatChf } from './money';

export function buildMenuDisplay(
  menu: MenuItemDTO[],
  foodById: Record<string, FoodItemDTO>
): DisplayItem[] {
  return menu.map((m) => {
    const food = foodById[m.foodItemId];
    return {
      id: m.id,
      foodItemId: m.foodItemId,
      foodItemName: food?.name ?? '—',
      description: food?.description,
      priceRaw: m.price,
      priceChf: formatChf(m.price),
      category: m.category,
      categoryLabel: categoryLabel(m.category),
      available: m.available,
    };
  });
}

export function groupByCategory(items: DisplayItem[]) {
  const map = new Map<MenuItemCategory, DisplayItem[]>();
  items.forEach((it) => {
    const arr = map.get(it.category) ?? [];
    arr.push(it);
    map.set(it.category, arr);
  });
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    categoryLabel: items[0]?.categoryLabel ?? category,
    items,
  }));
}

export function buildBuffetDisplay(
  buffet: BuffetItemReadDTO[],
  foodById: Record<string, FoodItemDTO>
): BuffetDisplayItem[] {
  return buffet.map((b) => {
    const food = foodById[b.foodItemId];
    return {
      id: b.id,
      foodItemId: b.foodItemId,
      foodItemName: food?.name ?? b.foodItemName ?? '—',
      priceRaw: b.price,
      priceChf: formatChf(b.price),
      available: b.available,
    };
  });
}
