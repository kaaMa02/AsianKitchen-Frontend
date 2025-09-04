// primitives
export type UUID = string;
export type BigDecimal = string;
export type LocalDateTime = string;

// ─────────────────────────────────────────────────────────────────────────────
// Address

export interface AddressDTO {
  street: string;
  streetNo: string;
  plz: string;
  city: string;
}

// Authentication
export interface AuthRequestDTO {
  username: string;
  password: string;
}

export interface RegisterRequestDTO {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// User

export enum Role {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN"
}

export interface UserReadDTO {
  id: UUID;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  role: Role;
}

export interface UserWriteDTO {
  username: string;
  password: string;
  role: Role;
}

export interface UserProfileUpdateDTO {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  address?: AddressDTO;
  password?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Food items

export interface FoodItemDTO {
  id?: UUID;
  name: string;
  description?: string;
  ingredients?: string;
  allergies?: string;
  imageUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Buffet items & orders

export interface BuffetItemReadDTO {
  id: UUID;
  available: boolean;
  foodItemId: UUID;
  foodItemName: string;
  price: BigDecimal;
}

export interface BuffetItemWriteDTO {
  foodItemId: UUID;
  available: boolean;
  price: BigDecimal;
}

export interface BuffetOrderItemDTO {
  buffetItemId: UUID;
  quantity: number;
}

export enum OrderType {
  DELIVERY = "DELIVERY",
  TAKEAWAY = "TAKEAWAY"
}

export enum OrderStatus {
  NEW = "NEW",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  ON_THE_WAY = "ON_THE_WAY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED"
}

export interface CustomerInfoDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: AddressDTO;
}

export interface BuffetOrderWriteDTO {
  userId?: UUID;
  customerInfo: CustomerInfoDTO;
  orderType: OrderType;
  specialInstructions?: string;
  items: BuffetOrderItemDTO[];
}

export interface BuffetOrderReadDTO {
  id: UUID;
  customerInfo: CustomerInfoDTO; // fixed
  orderType: OrderType;
  status: OrderStatus;
  createdAt: LocalDateTime;
  totalPrice: BigDecimal;
  specialInstructions?: string; // added
  orderItems?: BuffetOrderItemDTO[]; // added if frontend needs items
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu items & customer orders

export enum MenuItemCategory {
  SUSHI_STARTER = "SUSHI_STARTER",
  SUSHI_ROLLS = "SUSHI_ROLLS",
  HOSO_MAKI = "HOSO_MAKI",
  NIGIRI = "NIGIRI",
  TEMAKI = "TEMAKI",
  SUSHI_PLATTEN = "SUSHI_PLATTEN",
  BOWLS = "BOWLS",
  DONBURI = "DONBURI",
  RAMEN_NOODLE = "RAMEN_NOODLE",
  THAI_STARTER = "THAI_STARTER",
  THAI_SUPPE = "THAI_SUPPE",
  THAI_NOODLES = "THAI_NOODLES",
  THAI_CURRY = "THAI_CURRY",
  THAI_WOK = "THAI_WOK",
  SIDES = "SIDES",
  DESSERT = "DESSERT",
  DRINK = "DRINK",
}

export interface MenuItemDTO {
  id: UUID;
  foodItemId: UUID;
  category: MenuItemCategory;
  available: boolean;
  price: BigDecimal;
}

export interface MenuItemWriteDTO {
  foodItemId: UUID;
  category: MenuItemCategory;
  available: boolean;
  price: BigDecimal;
}

export interface OrderItemReadDTO {
  id: UUID;
  menuItemId?: UUID;
  quantity: number;
}

export interface OrderItemWriteDTO {
  menuItemId: UUID;
  quantity: number;
}

export interface CustomerOrderWriteDTO {
  userId?: UUID;
  customerInfo: CustomerInfoDTO;
  orderType: OrderType;
  specialInstructions?: string;
  items: OrderItemWriteDTO[];
}

export interface CustomerOrderReadDTO {
  id: UUID;
  customerInfo: CustomerInfoDTO;
  orderType: OrderType;
  status: OrderStatus;
  orderItems: OrderItemReadDTO[];
  totalPrice: BigDecimal;
  createdAt: LocalDateTime;
  specialInstructions?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reservations

export enum ReservationStatus {
  REQUESTED = "REQUESTED",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
  NO_SHOW = "NO_SHOW",
  CANCELLED = "CANCELLED"
}

export interface ReservationWriteDTO {
  customerInfo: CustomerInfoDTO;
  reservationDateTime: LocalDateTime;
  numberOfPeople: number;
  specialRequests?: string;
}

export interface ReservationReadDTO {
  id: UUID;
  customerInfo: CustomerInfoDTO;
  reservationDateTime: LocalDateTime;
  numberOfPeople: number;
  specialRequests?: string;
  status: ReservationStatus;
  createdAt: LocalDateTime;
  paymentStatus?: string;
}

export interface ReservationStatusDTO {
  status: ReservationStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Restaurant info

export interface RestaurantInfoWriteDTO {
  name: string;
  aboutText?: string;
  phone: string;
  email?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  openingHours?: string;
  address?: AddressDTO;
}

export interface RestaurantInfoReadDTO {
  id: UUID;
  name: string;
  aboutText?: string;
  phone: string;
  email?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  openingHours?: string;
  address: AddressDTO;
}

export interface PaymentIntentResponseDTO {
  clientSecret: string;
  amounts?: {
    total: number; // rappen
    tax: number;   // rappen
    net: number;   // rappen
    vatRatePct?: number;
  };
}

export interface PaymentConfirmDTO {
  paymentIntentId: string;
}

export interface ContactMessageWriteDTO {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ContactMessageReadDTO {
  id: UUID;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: LocalDateTime;
}