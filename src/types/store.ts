export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'card_standard' | 'cash_on_delivery';

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  defaultAddress?: ShippingAddress;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  featured: boolean;
  isNewArrival: boolean;
  sku: string;
  specs: string;
  lastOrderId?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartDocument {
  userId: string;
  items: CartItem[];
  updatedAt: unknown;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  lineTotal: number;
}

export interface Order {
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: unknown;
  updatedAt: unknown;
}

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const SCHEMA_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  SLUG_REGEX: /^[a-z0-9-]+$/,
  MAX_ID_LEN: 128,
  MAX_NAME_LEN: 100,
  MAX_EMAIL_LEN: 200,
  MAX_PHONE_LEN: 30,
  MAX_CATEGORY_NAME_LEN: 80,
  MAX_CATEGORY_DESC_LEN: 500,
  MAX_PRODUCT_NAME_LEN: 140,
  MAX_PRODUCT_DESC_LEN: 2000,
  MAX_IMAGE_URL_LEN: 1500,
  MAX_SKU_LEN: 64,
  MAX_SPECS_LEN: 500,
  MAX_CART_ITEMS: 50,
  MAX_ITEM_QTY: 99,
  FREE_SHIPPING_THRESHOLD: 250,
  STANDARD_SHIPPING_COST: 18,
} as const;

export const BOOTSTRAPPED_ADMIN_EMAIL = 'kiranmanju2007@gmail.com';
