
export enum Zone {
  MAIN_WH = 'Main WH (On-site)',
  CHEM_STORAGE = 'Chem Storage (On-site)',
  BANGA_WH = 'Banga WH (Off-site)',
  BANGA_CHEM = 'Banga Chem (Off-site)'
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
  zone: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  stock: Record<string, number>;
  batches: StockBatch[];
  earliestExpiry: string;
  unitCost: number;
  isFastMoving: boolean;
  parStock: number;
  initialParStock: number;
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

export interface PendingIssue {
  id: string;
  timestamp: string;
  user: string;
  receiverName?: string;
  department: string;
  signature?: string;
  items: CartItem[];
  status: 'pending' | 'released' | 'in progress';
}

export type UserRole = 'Guest' | 'Staff' | 'Manager';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface CartItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  zone: string;
  uom: string;
}

export interface SqlStatement {
  sql: string;
  args: (string | number | null)[];
}
