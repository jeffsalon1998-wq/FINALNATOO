import { create } from 'zustand';
import { InventoryItem, Transaction, PendingIssue, User, CartItem } from '../types';
import { db } from '../db';

interface AppState {
  appInit: boolean;
  isLoadingData: boolean;
  isSyncing: boolean;
  dbStatus: { connected: boolean; error?: string };
  inventory: InventoryItem[];
  transactions: Transaction[];
  pendingIssues: PendingIssue[];
  externalRequests: PendingIssue[];
  availableCategories: string[];
  availableDepartments: string[];
  availableZones: string[];
  currentUser: User | null;
  cart: CartItem[];
  activeExternalRequestId: string | null;
  
  // Actions
  setAppInit: (init: boolean) => void;
  setIsLoadingData: (loading: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  setDbStatus: (status: { connected: boolean; error?: string }) => void;
  setInventory: (inventory: InventoryItem[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setPendingIssues: (issues: PendingIssue[]) => void;
  setExternalRequests: (requests: PendingIssue[]) => void;
  setAvailableCategories: (categories: string[]) => void;
  setAvailableDepartments: (departments: string[]) => void;
  setAvailableZones: (zones: string[]) => void;
  setCurrentUser: (user: User | null) => void;
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  setActiveExternalRequestId: (id: string | null) => void;
  
  loadAppData: (silent?: boolean, onSuccess?: (msg: string) => void, onError?: (msg: string) => void) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  appInit: false,
  isLoadingData: true,
  isSyncing: false,
  dbStatus: { connected: false },
  inventory: [],
  transactions: [],
  pendingIssues: [],
  externalRequests: [],
  availableCategories: [],
  availableDepartments: [],
  availableZones: [],
  currentUser: null,
  cart: [],
  activeExternalRequestId: null,

  setAppInit: (init) => set({ appInit: init }),
  setIsLoadingData: (loading) => set({ isLoadingData: loading }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setDbStatus: (status) => set({ dbStatus: status }),
  setInventory: (inventory) => set({ inventory }),
  setTransactions: (transactions) => set({ transactions }),
  setPendingIssues: (issues) => set({ pendingIssues: issues }),
  setExternalRequests: (requests) => set({ externalRequests: requests }),
  setAvailableCategories: (categories) => set({ availableCategories: categories }),
  setAvailableDepartments: (departments) => set({ availableDepartments: departments }),
  setAvailableZones: (zones) => set({ availableZones: zones }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setCart: (cart) => set((state) => ({ 
    cart: typeof cart === 'function' ? cart(state.cart) : cart 
  })),
  setActiveExternalRequestId: (id) => set({ activeExternalRequestId: id }),

  loadAppData: async (silent = false, onSuccess, onError) => {
    try {
      if (!silent) set({ isSyncing: true });
      if (!get().appInit) set({ isLoadingData: true });
      
      const isInitialized = await db.initialize();
      if (!isInitialized) {
        throw new Error("Failed to initialize database connection.");
      }

      const [inv, txs, pi, extReqs, cfg] = await Promise.all([
        db.getInventory(), 
        db.getTransactions(), 
        db.getPendingIssues(), 
        db.getExternalRequests(),
        db.getConfig(), 
      ]);
      
      set({
        inventory: (inv as InventoryItem[]).map(item => ({ ...item, initialParStock: item.initialParStock || item.parStock })),
        transactions: txs as Transaction[],
        pendingIssues: pi as PendingIssue[],
        externalRequests: extReqs as PendingIssue[],
        availableCategories: cfg?.categories || [],
        availableDepartments: cfg?.departments || [],
        availableZones: cfg?.zones || [],
        dbStatus: { connected: true }
      });
      if (!silent && get().appInit && onSuccess) onSuccess("Cloud Data Synced");
    } catch (err: unknown) {
      console.error("Failed to sync data:", err);
      set({ dbStatus: { connected: false, error: (err as Error).message } });
      if (onError) onError(`Sync Error: ${(err as Error).message || 'Database connection failed'}`);
    } finally {
      set({ isLoadingData: false, isSyncing: false, appInit: true });
    }
  }
}));
