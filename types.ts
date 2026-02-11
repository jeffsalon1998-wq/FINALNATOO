export enum Zone {
  MAIN = 'Main (On-site 25sqm)',
  SATELLITE = 'Satellite (On-site 10sqm)',
  BULK = 'Bulk (4.5km Off-site 30sqm)',
  UTILITY = 'Utility (4.5km Off-site 15sqm)'
}

export enum Category {
  DRY_GOODS = 'Dry Goods',
  ALCOHOL = 'Alcohol',
  GUEST_SUPPLIES = 'Guest Supplies',
  CHEMICALS = 'Chemicals'
}

export interface StockBatch {
  id: string;
  expiry: string; // ISO Date
  quantity: number;
  zone: string; // Changed to string for dynamic zone management
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string; // Changed to string for dynamic category management
  uom: string;
  stock: Record<string, number>; // Dynamic zones
  batches: StockBatch[];
  earliestExpiry: string;
  unitCost: number;
  isFastMoving: boolean;
  parStock: number;
  initialParStock: number; // The original baseline to prevent extreme auto-downgrades
}

export interface Transaction {
  id: string;
  timestamp: string;
  user: string;
  action: 'ISSUE' | 'TRANSFER' | 'RECEIVE';
  qty: number;
  itemSku: string;
  itemName: string;
  itemUom?: string;
  sourceZone?: string;
  destZone: string;
  department?: string;
  signature?: string;
  receiverName?: string;
  prNumber?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'Staff' | 'Manager';
}

export interface CartItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  zone: string;
  uom: string;
}