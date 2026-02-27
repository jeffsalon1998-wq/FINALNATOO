
import { InventoryItem, Zone, User } from './types';

export const COLORS = {
  MAROON: '#800000',
  GOLD: '#FFD700',
  GRAY_LIGHT: '#F3F4F6',
  GRAY_BORDER: '#E5E7EB',
};

export const MOCK_USERS: User[] = [
  { id: 'staff', name: 'Sunlight Staff', role: 'Staff' },
  { id: 'guest', name: 'Guest Viewer', role: 'Guest' },
];

const todayPlus15 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1',
    sku: 'SKU-DRY-001',
    name: 'Jasmine Rice (25kg)',
    category: 'Dry Goods',
    uom: 'Sack',
    stock: { [Zone.MAIN]: 2 },
    batches: [
      { id: 'BAT-001', expiry: '2025-12-31', quantity: 2, zone: Zone.MAIN }
    ],
    earliestExpiry: '2025-12-31',
    unitCost: 1250,
    isFastMoving: true,
    parStock: 5,
    initialParStock: 5
  },
  {
    id: 'item-2',
    sku: 'SKU-ALC-001',
    name: 'San Miguel Pale Pilsen',
    category: 'Alcohol',
    uom: 'Case',
    stock: { [Zone.MAIN]: 24 },
    batches: [
      { id: 'BAT-002', expiry: todayPlus15, quantity: 24, zone: Zone.MAIN }
    ],
    earliestExpiry: todayPlus15,
    unitCost: 950,
    isFastMoving: true,
    parStock: 10,
    initialParStock: 10
  }
];

export const DEPARTMENTS = [
  'Housekeeping',
  'F&B Service',
  'Kitchen',
  'Front Office',
  'Engineering',
  'Spa & Wellness',
  'HR & Admin'
];

export const ZONES = Object.values(Zone);
