
import { 
  InventoryItem, Transaction, User, CartItem, StockBatch, Zone, PendingIssue
} from './types';
import React, { useState, useEffect, useMemo } from 'react';

import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, Package, History, ShoppingCart, 
  Search, X, CheckCircle2, Sparkles,
  Settings, TrendingDown, 
  PlusCircle, RotateCcw,
  ArrowRight, ShieldCheck, ClipboardList, CalendarClock, Lock, Loader2, Eye, Save, Send, FileOutput, Trash2, Database, Shield, Cloud, ExternalLink, RefreshCw, UploadCloud, AlertCircle, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { StatCard } from './components/StatCard';
import { ItemCard } from './components/ItemCard';
import { SignaturePad } from './components/SignaturePad';
import { db } from './db';


const BRAND_YELLOW = "#FFFF00"; 

const GLOBAL_ZONE_KEY = 'All Zones';
const GLOBAL_CATEGORY_KEY = 'All Categories';

const BrandLogo = ({ className = "", color = BRAND_YELLOW, scale = "text-5xl", subScale = "text-[10px]", subClassName = "" }: { className?: string, color?: string, scale?: string, subScale?: string, subClassName?: string }) => {
  const isYellow = color === BRAND_YELLOW;
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <span 
        className={`${scale} brand-script leading-[0.7]`} 
        style={{ 
          fontFamily: 'Great Vibes, cursive',
          color,
          WebkitTextStroke: isYellow ? '0.8px black' : 'none',
          textShadow: isYellow ? '1px 1px 0px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        Sunlight
      </span>
      <span className={`${scale === 'text-8xl' ? 'text-sm' : subScale} brand-title uppercase tracking-[0.4em] ${subClassName}`} style={{ marginTop: '-5px', color: isYellow ? 'rgba(0,0,0,0.7)' : '#4b5563' }}>Hotel, Coron</span>
    </div>
  );
};

const App: React.FC = () => {
  // App States
  const [appInit, setAppInit] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error?: string }>({ connected: false });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingIssues, setPendingIssues] = useState<PendingIssue[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableZones, setAvailableZones] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'inventory' | 'pending' | 'history' | 'settings'>('dashboard');



  // UI States
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(true);
  const [selectedZone] = useState<string>(GLOBAL_ZONE_KEY);
  const [selectedCategory, setSelectedCategory] = useState<string>(GLOBAL_CATEGORY_KEY);
  const [searchTerm, setSearchTerm] = useState('');
  const [logDeptFilter, setLogDeptFilter] = useState('All');
  const [historyTab, setHistoryTab] = useState<'logs' | 'receipts'>('logs');
  const [showAddSuccess, setShowAddSuccess] = useState<string | null>(null);
  const [showError, setShowError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Modals
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState<InventoryItem | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'queue' | 'release'>('queue');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFinalizingIssue, setIsFinalizingIssue] = useState(false);
  const [activeRequestToFinalize, setActiveRequestToFinalize] = useState<PendingIssue | null>(null);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [reportModal, setReportModal] = useState<{ open: boolean, title: string, items: (InventoryItem & Record<string, unknown>)[] }>({ open: false, title: '', items: [] });
  const [isCloudSetupOpen, setIsCloudSetupOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRequestPickerOpen, setIsRequestPickerOpen] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [externalRequests, setExternalRequests] = useState<PendingIssue[]>([]);
  const [releasedIssues, setReleasedIssues] = useState<PendingIssue[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  
  // Turso Config State
  const [tursoUrl, setTursoUrl] = useState(localStorage.getItem('TURSO_URL') || process.env.VITE_TURSO_URL);
  const [tursoToken, setTursoToken] = useState(localStorage.getItem('TURSO_TOKEN') || process.env.VITE_TURSO_TOKEN);

  const [activeExternalRequestId, setActiveExternalRequestId] = useState<string | null>(null);
  
  // Audit Mode
  const [isAuditMode, setIsAuditMode] = useState(() => localStorage.getItem('isAuditMode') === 'true');
  const [showAuditExitConfirm, setShowAuditExitConfirm] = useState(false);
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('auditCounts');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("Failed to parse auditCounts from localStorage", e);
      return {};
    }
  });

  useEffect(() => {
    if (isAuditMode) {
      localStorage.setItem('isAuditMode', 'true');
    } else {
      localStorage.removeItem('isAuditMode');
    }
  }, [isAuditMode]);

  useEffect(() => {
    if (Object.keys(auditCounts).length > 0) {
      localStorage.setItem('auditCounts', JSON.stringify(auditCounts));
    } else {
      localStorage.removeItem('auditCounts');
    }
  }, [auditCounts]);

  // Transaction Finalization
  const [receiverName, setReceiverName] = useState('');
  const [receiverDept, setReceiverDept] = useState('Kitchen');
  const [signature, setSignature] = useState<string | null>(null);
  const [receiptToExport, setReceiptToExport] = useState<PendingIssue | null>(null);

  // New Item Data
  const [newItemData, setNewItemData] = useState<Partial<InventoryItem & { receivedQty: number; restockZone: string; expiryDate: string; notExpiring: boolean }>>({
    name: '', sku: '', category: '', uom: 'Units', unitCost: 0, parStock: 0, receivedQty: 1, restockZone: '', expiryDate: '', notExpiring: false
  });
  const [itemSuggestions, setItemSuggestions] = useState<InventoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isGuest = currentUser?.role === 'Guest';
  const isStaff = currentUser?.role === 'Staff' || currentUser?.role === 'Manager';

  const notify = (msg: string) => {
    setShowAddSuccess(msg);
    setTimeout(() => setShowAddSuccess(null), 2000);
  };

  const notifyError = (msg: string) => {
    setShowError(msg);
    setTimeout(() => setShowError(null), 4000);
  };

  const loadAppData = async (silent = false) => {
    try {
      if (!silent) setIsSyncing(true);
      if (!appInit) {
        // App initialization logic
      }

      const isInitialized = await db.initialize();
      if (!isInitialized) {
        throw new Error("Failed to initialize database connection.");
      }

      const [inv, txs, pi, extReqs, cfg, relIssues] = await Promise.all([
        db.getInventory(), 
        db.getTransactions(), 
        db.getPendingIssues(), 
        db.getExternalRequests(),
        db.getConfig(),
        db.getReleasedIssues()
      ]);
      
      setInventory((inv as InventoryItem[]).map(item => ({ ...item, initialParStock: item.initialParStock || item.parStock })));
      setTransactions(txs as Transaction[]);
      setPendingIssues(pi as PendingIssue[]);
      setExternalRequests(extReqs as PendingIssue[]);
      setReleasedIssues(relIssues as PendingIssue[]);
      setAvailableCategories(cfg?.categories || []);
      setAvailableDepartments(cfg?.departments || []);
      setAvailableZones(cfg?.zones || []);
      
      setDbStatus({ connected: true });
      if (!silent && appInit) notify("Cloud Data Synced");
    } catch (err: unknown) {
      console.error("Failed to sync data:", err);
      setDbStatus({ connected: false, error: (err as Error).message });
      notifyError(`Sync Error: ${(err as Error).message || 'Database connection failed'}`);
      if (!appInit) {
        setIsCloudSetupOpen(true);
      }
    } finally {
      setIsSyncing(false);
      setAppInit(true);
    }
  };

  const handleToggleAudit = () => {
    if (isAuditMode) {
      setShowAuditExitConfirm(true);
    } else {
      setIsAuditMode(true);
      notify("Audit Mode Started");
    }
  };

  const confirmExitAudit = () => {
    setIsAuditMode(false);
    setAuditCounts({});
    setShowAuditExitConfirm(false);
    notify("Audit Ended");
  };


  const handleAuditCountChange = (itemId: string, count: number) => {
    setAuditCounts(prev => ({ ...prev, [itemId]: count }));
  };

  useEffect(() => {
    loadAppData();

    const syncInterval = setInterval(() => {
      loadAppData(true); // Silent sync
    }, 30000); // Every 30 seconds

    return () => clearInterval(syncInterval);
  }, []);

  // --- End Scanner Implementation ---

  // --- End Scanner Implementation ---

  const handleForcePushSync = async () => {
    if (isGuest) return;
    if (!confirm("Overwrite cloud database with current local state? This is irreversible.")) return;
    
    setIsSyncing(true);
    try {
      await db.pushState(inventory, transactions, pendingIssues);
      notify("State Pushed to Database");
    } catch (err: unknown) {
      console.error("Push failed", err);
      notifyError(`Push Failed: ${(err as Error).message || 'Check database connection'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAggregates = (item: InventoryItem): InventoryItem => {
    const stock: Record<string, number> = {};
    (availableZones || []).forEach(z => stock[z] = 0);
    let earliest = '2099-12-31';
    (item.batches || []).forEach(b => {
      if (b.quantity > 0) {
        const zone = b.zone || availableZones[0];
        if (!stock[zone]) stock[zone] = 0;
        stock[zone] += b.quantity;
        if (b.expiry && b.expiry < earliest) earliest = b.expiry;
      }
    });
    return { ...item, stock, earliestExpiry: earliest };
  };

  const handleQueueRequest = async () => {
    if (!receiverDept || isGuest) return;
    const newTxId = activeExternalRequestId || `REQ-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    
    const newPending: PendingIssue = {
      id: newTxId,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Unknown',
      department: receiverDept,
      items: [...cart],
      status: 'pending'
    };

    try {
      if (checkoutMode === 'release') {
        setActiveRequestToFinalize(newPending);
        setIsFinalizingIssue(true);
        setIsCheckingOut(false);
        setIsCartOpen(false);
      } else {
        await db.updatePendingIssues([newPending]);
        const updatedPending = [newPending, ...(pendingIssues || [])];
        setPendingIssues([...updatedPending]);
        setCart([]); 
        setActiveExternalRequestId(null);
        setIsCheckingOut(false); 
        setIsCartOpen(false); 
        notify(`Request Queued: ${newTxId}`);
        setView('pending');
      }
    } catch (e: unknown) {
      notifyError(`Queue Failed: ${(e as Error).message}`);
    }
  };

  const handleDeletePending = async (id: string) => {
    try {
      await db.deletePendingIssue(id);
      const updated = (pendingIssues || []).filter(p => p.id !== id);
      setPendingIssues([...updated]);
      notify('Request Removed');
    } catch (e: unknown) {
      notifyError(`Delete Failed: ${(e as Error).message}`);
    }
  };

  const handleClearHistory = async () => {
    if (!isStaff || !confirm('Permanently clear all activity logs?')) return;
    try {
      await db.updateTransactions([]);
      setTransactions([]);
      notify('History Cleared');
    } catch (e: unknown) {
      notifyError(`Clear Failed: ${(e as Error).message}`);
    }
  };

  const exportReceiptAsImage = async (req: PendingIssue) => {
    setReceiptToExport(req);
    // Wait for React to render the component
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const el = document.getElementById(`receipt-${req.id}`);
    if (!el) {
      notifyError("Export failed: Receipt preview not found");
      setReceiptToExport(null);
      return;
    }
    
    try {
      // Ensure element is visible but off-screen for capture
      el.style.display = 'block';
      el.style.position = 'absolute'; // Changed to absolute
      el.style.left = '0';
      el.style.top = '0';
      el.style.zIndex = '-1';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      
      const dataUrl = await htmlToImage.toPng(el, {
        backgroundColor: '#ffffff',
        width: el.offsetWidth, // Use offsetWidth for accurate width
        height: el.offsetHeight, // Use offsetHeight for accurate height
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: false,
        style: {
          margin: '0',
          padding: '0',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          visibility: 'visible',
          display: 'flex'
        }
      });
      
      const link = document.createElement('a');
      link.download = `Sunlight_Receipt_${req.id}.png`;
      link.href = dataUrl;
      link.click();
      notify("Receipt Exported");
    } catch (error) {
      console.error('Error generating receipt:', error);
      notifyError("Failed to generate receipt image");
    } finally {
      setReceiptToExport(null);
    }
  };

  const handleFinalRelease = async () => {
    if (!activeRequestToFinalize || !signature || !receiverName || isGuest) return;
    const updatedInventory = [...inventory];
    const newTransactions: Transaction[] = [];

    for (const item of activeRequestToFinalize.items) {
      const invItem = updatedInventory.find(i => i.id === item.itemId);
      const totalStock = Object.values(invItem?.stock || {}).reduce((a, b) => (a as number) + (b as number), 0);
      if (totalStock < item.quantity) {
        alert(`Insufficient Stock: ${item.name} (Total Available: ${totalStock})`);
        return;
      }
    }

    const modifiedItems: InventoryItem[] = [];

    activeRequestToFinalize.items.forEach(cartItem => {
      const invIndex = updatedInventory.findIndex(i => i.id === cartItem.itemId);
      if (invIndex === -1) return;
      const item = JSON.parse(JSON.stringify(updatedInventory[invIndex]));
      let remainingToDeduct = cartItem.quantity;
      
      // Get all batches with quantity > 0, sorted by expiry (FIFO)
      const availableBatches = (item.batches || [])
        .filter(b => b.quantity > 0)
        .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());

      for (const batch of availableBatches) {
        if (remainingToDeduct <= 0) break;
        const bIdx = item.batches.findIndex(ob => ob.id === batch.id && ob.zone === batch.zone);
        if (bIdx === -1) continue;

        const deduct = Math.min(batch.quantity, remainingToDeduct);
        item.batches[bIdx] = { ...item.batches[bIdx], quantity: item.batches[bIdx].quantity - deduct };
        remainingToDeduct -= deduct;
      }
      
      const updatedItem = syncAggregates(item);
      updatedInventory[invIndex] = updatedItem;
      modifiedItems.push(updatedItem);

      newTransactions.push({ 
        id: `TX-${activeRequestToFinalize.id}-${cartItem.sku}-${Date.now()}`, 
        timestamp: new Date().toISOString(), 
        user: currentUser?.name || 'Unknown', 
        action: 'ISSUE', 
        qty: cartItem.quantity, 
        itemSku: cartItem.sku, 
        itemName: cartItem.name, 
        itemUom: cartItem.uom, 
        destZone: cartItem.zone, // Kept for reference, though it might be mixed
        department: activeRequestToFinalize.department, 
        receiverName: receiverName, 
        signature: signature
      });
    });

    try {
      const finalizedReq = { ...activeRequestToFinalize, signature, receiverName, status: 'released' as const };
      
      await db.updateInventory(modifiedItems);
      await db.addTransactions(newTransactions);
      
      // Update the request status in DB (UPSERT)
      await db.updatePendingIssues([finalizedReq]);
      
      // If it's an external request, update the external DB status
      if (finalizedReq.id.startsWith('SGHC')) {
        await db.updateExternalRequestStatus(finalizedReq.id, 'Released');
      }
      
      const remainingPending = (pendingIssues || []).filter(pi => pi.id !== activeRequestToFinalize.id);

      setInventory([...updatedInventory]);
      setTransactions(prev => [...newTransactions, ...(prev || [])]);
      setPendingIssues([...remainingPending]);
      setReleasedIssues(prev => [finalizedReq, ...(prev || [])]);
      
      setIsFinalizingIssue(false);
      setCart([]);
      setActiveExternalRequestId(null);
      
      // Use the improved async export function
      exportReceiptAsImage(finalizedReq).then(() => {
        setActiveRequestToFinalize(null);
        setReceiverName('');
        setSignature(null);
      });

      notify(`Released & Receipt Generated`);
    } catch (e: unknown) {
      console.error("Release failed:", e);
      notifyError(`Release Failed: ${(e as Error).message}`);
    }
  };

  const handleAddItemSubmit = async () => {
    if (!newItemData.name || (newItemData.receivedQty || 0) <= 0 || isGuest) return;
    
    const existingItem = (inventory || []).find(i => i.name.toLowerCase() === newItemData.name?.toLowerCase());
    const updatedInventory = [...inventory];
    
    const newBatch: StockBatch = {
      id: `BAT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      expiry: newItemData.notExpiring ? '2099-12-31' : (newItemData.expiryDate || '2099-12-31'),
      quantity: newItemData.receivedQty || 0,
      zone: newItemData.restockZone || availableZones[0]
    };

    let modifiedItem: InventoryItem;

    if (existingItem) {
      const idx = updatedInventory.findIndex(i => i.id === existingItem.id);
      const updatedItem = { ...existingItem };
      updatedItem.batches = [...(updatedItem.batches || []), newBatch];
      modifiedItem = syncAggregates(updatedItem);
      updatedInventory[idx] = modifiedItem;
    } else {
      const item: InventoryItem = {
        id: `item-${Date.now()}`,
        sku: newItemData.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
        name: newItemData.name!,
        category: newItemData.category || availableCategories[0],
        uom: newItemData.uom || 'Units',
        unitCost: newItemData.unitCost || 0,
        parStock: newItemData.parStock || 0,
        initialParStock: newItemData.parStock || 0,
        isFastMoving: false,
        batches: [newBatch],
        stock: {},
        earliestExpiry: newBatch.expiry
      };
      modifiedItem = syncAggregates(item);
      updatedInventory.push(modifiedItem);
    }

    const tx: Transaction = { 
      id: `RX-${Date.now()}`, 
      timestamp: new Date().toISOString(), 
      user: currentUser?.name || 'Unknown', 
      action: 'RECEIVE', 
      qty: newItemData.receivedQty || 0, 
      itemSku: newItemData.sku || existingItem?.sku || 'AUTO', 
      itemName: newItemData.name!, 
      destZone: newBatch.zone 
    };

    try {
      await db.updateInventory([modifiedItem]);
      await db.addTransactions([tx]);
      setInventory([...updatedInventory]);
      setTransactions(prev => [tx, ...(prev || [])]);
      setIsAddingItem(false);
      setNewItemData({ name: '', sku: '', category: '', uom: 'Units', unitCost: 0, parStock: 0, receivedQty: 1, restockZone: '', expiryDate: '', notExpiring: false });
      notify("Stock Received");
    } catch (e: unknown) {
      notifyError(`Receive Failed: ${(e as Error).message}`);
    }
  };

  const handleEditItemSubmit = async () => {
    if (!isEditingItem || isGuest) return;
    try {
      const updatedWithAggregates = syncAggregates(isEditingItem);
      const updated = (inventory || []).map(i => i.id === updatedWithAggregates.id ? updatedWithAggregates : i);
      await db.updateInventory([updatedWithAggregates]);
      setInventory([...updated]);
      setIsEditingItem(null);
      notify("Item Updated");
    } catch (e: unknown) {
      notifyError(`Update Failed: ${(e as Error).message}`);
    }
  };

  const handleDeleteItem = async () => {
    if (!isEditingItem || isGuest) return;
    try {
      await db.deleteInventoryItem(isEditingItem.id);
      const updated = (inventory || []).filter(i => i.id !== isEditingItem.id);
      setInventory([...updated]);
      setIsEditingItem(null);
      notify("Item Registry Erased");
    } catch (e: unknown) {
      notifyError(`Delete Failed: ${(e as Error).message}`);
    }
  };

  const handleUpdateConfig = async (key: 'departments' | 'categories', newList: string[]) => {
    try {
      const currentConfig = await db.getConfig();
      const updatedConfig = { ...currentConfig, [key]: newList };
      await db.saveConfig(updatedConfig);
      if (key === 'departments') setAvailableDepartments([...newList]);
      else setAvailableCategories([...newList]);
      notify(`${key.charAt(0).toUpperCase() + key.slice(1)} Updated`);
    } catch (e: unknown) {
      notifyError(`Config Update Failed: ${(e as Error).message}`);
    }
  };

  const handleVerifyPassword = async () => {
    const stored = await db.getAdminPassword();
    if (passwordInput === stored) {
      if (pendingUser) setCurrentUser(pendingUser);
      setIsPasswordPromptOpen(false); setIsUserSelectorOpen(false); setPendingUser(null); setPasswordInput('');
    } else { setPasswordError(true); setTimeout(() => setPasswordError(false), 1000); }
  };

  const handleCloudConnect = async () => {
    if (!tursoUrl || !tursoToken || isGuest) return;
    setIsConnecting(true);
    try {
      const success = await db.setCredentials(tursoUrl!, tursoToken!);
      if (success) {
        await loadAppData();
        setIsCloudSetupOpen(false);
        notify("Cloud Synced Successfully");
      } else {
        notifyError("Connection Failed: Please check URL and Token.");
      }
    } catch (e: unknown) {
      notifyError(`Connection Error: ${(e as Error).message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCloudDisconnect = async () => {
    if (isGuest) return;
    if (confirm("Reset to default production database?")) {
      await db.disconnectCloud();
      
      await loadAppData();
      setIsCloudSetupOpen(false);
      notify("Cloud Disconnected");
    }
  };

  const showLowParReport = () => {
    const lowParItems = (inventory || []).filter(item => {
      const totalStock = Object.values(item.stock || {}).reduce((a, b) => (a as number) + (b as number), 0);
      return totalStock <= (item.parStock || 0);
    }).sort((a, b) => new Date(a.earliestExpiry).getTime() - new Date(b.earliestExpiry).getTime());
    setReportModal({ open: true, title: 'Low Par Stock Items', items: lowParItems });
  };

  const generateReorderList = () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const consumptionData: Record<string, number> = {};

    transactions
      .filter(t => t.action === 'ISSUE' && new Date(t.timestamp) >= thirtyDaysAgo)
      .forEach(t => {
        if (!consumptionData[t.itemSku]) {
          consumptionData[t.itemSku] = 0;
        }
        consumptionData[t.itemSku] += t.qty;
      });

    const reorderItems = inventory
      .map(item => {
        const monthlyConsumption = consumptionData[item.sku] || 0;
        const dailyConsumption = monthlyConsumption / 30;
        const leadTimeDemand = dailyConsumption * 20; // Max lead time
        const safetyStock = dailyConsumption * 7; // 1 week safety stock
        const dynamicPar = Math.ceil(leadTimeDemand + safetyStock);
        const currentStock = Object.values(item.stock).reduce((a, b) => a + b, 0);
        const reorderQty = Math.ceil(dailyConsumption * 30 - currentStock);

        return {
          ...item,
          dynamicPar,
          currentStock,
          reorderQty,
          monthlyConsumption,
        };
      })
      .filter(item => item.currentStock < item.dynamicPar && item.reorderQty > 0);

    setReportModal({ open: true, title: 'Reorder List', items: reorderItems });
  };

  const showNearExpiryReport = () => {
    const nearExpiryItems = (inventory || []).map(item => {
      const nearExpiryBatches = (item.batches || []).filter(batch => {
        if (batch.expiry === '2099-12-31') return false;
        const expiryDate = new Date(batch.expiry);
        const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diffDays <= 90;
      });

      if (nearExpiryBatches.length === 0) return null;

      return {
        ...item,
        batches: nearExpiryBatches,
      };
    }).filter(Boolean).sort((a, b) => new Date(a.earliestExpiry).getTime() - new Date(b.earliestExpiry).getTime());

    setReportModal({ open: true, title: 'Near Expiry Audit', items: nearExpiryItems });
  };



  const handleExportAuditToXLSX = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- Audit Report Sheet --- 
    const auditHeaders = ['Item', 'UOM', 'Beginning Stock', 'Inbound', 'Issued', 'Expected Count', 'Actual Count', 'Variance', 'Unit Price', 'Total Price'];
    let grandTotal = 0;
    const auditRows = inventory.map(item => {
      const currentStock = Object.values(item.stock).reduce((a, b) => a + b, 0);
      const inboundTx = transactions.filter(t => t.itemSku === item.sku && t.action === 'RECEIVE' && new Date(t.timestamp) >= startOfMonth);
      const issuedTx = transactions.filter(t => t.itemSku === item.sku && t.action === 'ISSUE' && new Date(t.timestamp) >= startOfMonth);
      const inboundCount = inboundTx.reduce((sum, t) => sum + t.qty, 0);
      const issuedCount = issuedTx.reduce((sum, t) => sum + t.qty, 0);
      const beginningStock = currentStock - inboundCount + issuedCount;
      const expectedCount = beginningStock + inboundCount - issuedCount;
      const actualCount = auditCounts[item.id] ?? 0;
      const variance = actualCount - expectedCount;
      const unitPrice = item.unitCost || 0;
      const totalPrice = actualCount * unitPrice;
      grandTotal += totalPrice;

      return [item.name, item.uom, beginningStock, inboundCount, issuedCount, expectedCount, actualCount, variance, unitPrice, totalPrice];
    });

    const auditData = [
      ['SUNLIGHT Hotel, Coron - Inventory Audit'],
      [],
      auditHeaders,
      ...auditRows,
      [],
      ['', '', '', '', '', '', '', '', 'Grand Total:', grandTotal]
    ];

    // --- Consumption Report Sheet ---
    const consumptionHeaders = ['Date Issued', 'Department', 'Item', 'Quantity', 'Unit Price', 'Total Price Issued'];
    const issues = transactions.filter(t => t.action === 'ISSUE').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const consumptionRows: (string | number)[][] = issues.map(t => {
      const itemInfo = inventory.find(i => i.sku === t.itemSku);
      const unitPrice = itemInfo?.unitCost || 0;
      return [
        new Date(t.timestamp).toLocaleDateString(),
        t.department || 'Unassigned',
        t.itemName,
        t.qty,
        unitPrice,
        t.qty * unitPrice
      ];
    });

    const consumptionData = [
      ['SUNLIGHT Hotel, Coron - Consumption Report'],
      [],
      consumptionHeaders,
      ...consumptionRows
    ];

    // --- Create Workbook ---
    const wb = XLSX.utils.book_new();
    const auditSheet = XLSX.utils.aoa_to_sheet(auditData);
    const consumptionSheet = XLSX.utils.aoa_to_sheet(consumptionData);
    XLSX.utils.book_append_sheet(wb, auditSheet, 'Audit Report');
    XLSX.utils.book_append_sheet(wb, consumptionSheet, 'Consumption Report');

    XLSX.writeFile(wb, `Sunlight_Audit_Report_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`);
    notify("Audit Report Exported");
  };

  const exportReportToCSV = (title: string, items: (InventoryItem & Record<string, unknown>)[] | null) => {
    if (!items) return;
    if (title === 'Reorder List') {
      const headers = ['SKU', 'Name', 'Current Stock', 'Dynamic PAR', 'Monthly Consumption', 'Reorder Qty'];
      const rows = (items || []).map(i => [
        i.sku, 
        i.name, 
        i.currentStock as number, 
        i.dynamicPar as number, 
        i.monthlyConsumption as number,
        i.reorderQty as number
      ]);
      const content = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sunlight_Reorder_List_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      notify("CSV Exported");
      return;
    }

    const headers = ['SKU', 'Name', 'Unit Cost', 'Stock', 'Par Stock', 'Expiry'];
    const rows = (items || []).map(i => [
      i.sku, 
      i.name, 
      i.unitCost, 
      Object.values(i.stock || {}).reduce((a, b) => (a as number) + (b as number), 0), 
      i.parStock, 
      i.earliestExpiry
    ]);
    const content = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sunlight_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    notify("CSV Exported");
  };

  const handleExportReceipts = async () => {
    if (!exportStartDate || !exportEndDate) {
      notifyError("Please select date range");
      return;
    }

    setIsSyncing(true);
    try {
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      end.setHours(23, 59, 59, 999);

      // Fetch actual released receipts from the database
      const receipts = await db.getReleasedIssues(start.toISOString(), end.toISOString());

      if (receipts.length === 0) {
        notifyError("No receipts found in this range");
        return;
      }

      const headers = ['Receipt Date', 'Receipt ID', 'Department', 'Receiver', 'Item Name', 'SKU', 'Quantity', 'UOM', 'Issued By', 'Signature Status'];
      const rows: (string | number)[][] = [];

      receipts.forEach(receipt => {
        receipt.items.forEach(item => {
          rows.push([
            new Date(receipt.timestamp).toLocaleString(),
            receipt.id,
            receipt.department,
            receipt.receiverName || 'N/A',
            item.name,
            item.sku,
            item.quantity,
            item.uom,
            receipt.user,
            receipt.signature ? 'Signed' : 'No Signature'
          ]);
        });
      });

      const content = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sunlight_Full_Receipts_${exportStartDate}_to_${exportEndDate}.csv`;
      a.click();
      setIsExportModalOpen(false);
      notify("Full Receipts Exported");
    } catch (error) {
      console.error("Export failed:", error);
      notifyError("Failed to export receipts");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportVisualReceipts = async () => {
    if (!exportStartDate || !exportEndDate) {
      notifyError("Please select date range");
      return;
    }

    setIsSyncing(true);
    try {
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      end.setHours(23, 59, 59, 999);

      const receipts = await db.getReleasedIssues(start.toISOString(), end.toISOString());

      if (receipts.length === 0) {
        notifyError("No receipts found in this range");
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      notify(`Preparing ${receipts.length} receipts...`);

      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        setReceiptToExport(receipt);
        
        // Wait for React to render the hidden div
        await new Promise(resolve => setTimeout(resolve, 400));

        const element = document.getElementById(`receipt-${receipt.id}`);
        if (element) {
          // Temporarily show it for capture
          element.style.display = 'block';
          element.style.position = 'absolute'; // Changed to absolute
          element.style.left = '0';
          element.style.top = '0';
          element.style.zIndex = '-1';
          element.style.visibility = 'visible';
          
          const dataUrl = await htmlToImage.toPng(element, {
            backgroundColor: '#ffffff',
            width: element.scrollWidth, // Use scrollWidth for accurate width
            height: element.scrollHeight, // Use scrollHeight for accurate height
            pixelRatio: 2,
            cacheBust: true,
            style: {
              margin: '0',
              padding: '0',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              visibility: 'visible',
              display: 'flex'
            }
          });
          
          element.style.display = 'none';

          if (i > 0) pdf.addPage();
          
          // Calculate dimensions to fit A4
          const imgProps = pdf.getImageProperties(dataUrl);
          const pdfWidth = pageWidth - 20; // 10mm margins
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          pdf.addImage(dataUrl, 'PNG', 10, 10, pdfWidth, pdfHeight);
        }
      }

      pdf.save(`Sunlight_Visual_Receipts_${exportStartDate}_to_${exportEndDate}.pdf`);
      setReceiptToExport(null);
      setIsExportModalOpen(false);
      notify("Visual PDF Exported");
    } catch (error) {
      console.error("Visual export failed:", error);
      notifyError("Failed to export visual receipts");
    } finally {
      setIsSyncing(false);
    }
  };

  const stockValue = useMemo(() => {
    return (inventory || []).reduce((total, item) => {
      // Fix: Cast Object.values to number[] to resolve unknown operand error in reduce addition
      const totalQty = (Object.values(item.stock || {}) as number[]).reduce((sum, qty) => sum + qty, 0);
      return total + (totalQty * (item.unitCost || 0));
    }, 0);
  }, [inventory]);

  const filteredInventory = useMemo(() => (inventory || []).filter(i => {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) {
      const zoneMatch = selectedZone === GLOBAL_ZONE_KEY || ((i.stock?.[selectedZone] || 0) > 0);
      const categoryMatch = selectedCategory === GLOBAL_CATEGORY_KEY || i.category === selectedCategory;
      return zoneMatch && categoryMatch;
    }
    
    const nameMatch = (i.name || '').toLowerCase().includes(term);
    const skuMatch = (i.sku || '').toLowerCase().includes(term);
    const zoneMatch = selectedZone === GLOBAL_ZONE_KEY || ((i.stock?.[selectedZone] || 0) > 0);
    const categoryMatch = selectedCategory === GLOBAL_CATEGORY_KEY || i.category === selectedCategory;
    
    return (nameMatch || skuMatch) && zoneMatch && categoryMatch;
  }), [inventory, searchTerm, selectedZone, selectedCategory]);

  const filteredLogs = useMemo(() => (transactions || []).filter(t => {
    return logDeptFilter === 'All' || t.department === logDeptFilter;
  }), [transactions, logDeptFilter]);

  if (!appInit) {
    return (
      <div className="fixed inset-0 bg-[#800000] flex flex-col items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <BrandLogo scale="text-7xl" subScale="text-xs" />
          <div className="mt-12 flex flex-col items-center gap-2">
            <Loader2 className="text-[#FFD700] animate-spin" size={32} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700]/60">Booting Turso Environment...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f9fafb] text-gray-900 overflow-hidden pt-safe">
      {showAddSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] bg-[#800000] text-white px-6 py-3 rounded-2xl shadow-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 animate-in slide-in-from-top duration-300">
           <CheckCircle2 size={16} /> {showAddSuccess}
        </div>
      )}

      {showError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 animate-in slide-in-from-top duration-300">
           <AlertCircle size={16} /> {showError}
        </div>
      )}

      {isUserSelectorOpen && (
        <div className="fixed inset-0 z-[3000] bg-[#800000] flex items-center justify-center p-6">
          <div className="w-full max-sm:w-[95%] max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="text-center">
              <BrandLogo color="#800000" scale="text-6xl" subScale="text-[9px]" />
              <div className="h-px bg-gray-100 w-full mt-6 mb-6"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Profile Selection</h3>
            </div>
            
            <div className="bg-gray-50 rounded-[2rem] p-4 grid grid-cols-1 gap-4 border border-gray-100 shadow-inner">
              <button 
                onClick={() => {
                  setPendingUser({ id: 'staff', name: 'HOTEL STAFF', role: 'Staff' });
                  setIsPasswordPromptOpen(true);
                }}
                className="p-5 rounded-3xl bg-white border border-transparent hover:border-[#800000]/20 transition-all flex items-center justify-between group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-red-50 text-[#800000] rounded-2xl shadow-sm"><Shield size={22} strokeWidth={2.5} /></div>
                  <div className="text-left">
                    <p className="text-[13px] font-black text-gray-900 uppercase">Hotel Staff</p>
                    <p className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">Full Operational Access</p>
                  </div>
                </div>
                <Lock size={16} className="text-gray-300" />
              </button>
              
              <button 
                onClick={() => {
                  setCurrentUser({ id: 'guest', name: 'GUEST VIEWER', role: 'Guest' });
                  setIsUserSelectorOpen(false);
                }}
                className="p-5 rounded-3xl bg-white border border-transparent hover:border-gray-200 transition-all flex items-center justify-between group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-gray-50 text-gray-400 rounded-2xl shadow-sm"><Eye size={22} strokeWidth={2.5} /></div>
                  <div className="text-left">
                    <p className="text-[13px] font-black text-gray-900 uppercase">Guest Viewer</p>
                    <p className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">View-only Access</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-200" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isPasswordPromptOpen && (
        <div className="fixed inset-0 z-[3100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`bg-white rounded-[2rem] p-8 w-full max-sm:w-[95%] max-w-sm text-center space-y-6 border-4 border-[#800000]/10 ${passwordError ? 'animate-shake' : ''}`}>
            <div className="w-14 h-14 bg-[#800000]/5 text-[#800000] rounded-full flex items-center justify-center mx-auto"><ShieldCheck size={28} /></div>
            <div className="space-y-1"><h3 className="text-sm font-black uppercase tracking-widest">Verify Access</h3><p className="text-[8px] font-bold text-gray-400 uppercase">Enter Shared Password</p></div>
            <input autoFocus type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} className="w-full text-center text-4xl font-black tracking-[0.4em] outline-none border-b-2 border-[#800000] pb-1" />
            <div className="flex gap-4"><button onClick={() => { setIsPasswordPromptOpen(false); setPendingUser(null); }} className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase">Cancel</button><button onClick={handleVerifyPassword} className="flex-1 py-3 bg-[#800000] text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Unlock</button></div>
          </div>
        </div>
      )}

      <header className="bg-[#800000] text-white px-5 shadow-lg flex justify-between items-center h-14 shrink-0 z-50">
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setView('dashboard')} className="active:scale-95 transition-transform"><BrandLogo scale="text-3xl" subScale="text-[5px]" className="items-start" /></button>
          <button onClick={() => setIsCloudSetupOpen(true)} className="ml-2 text-white/60 hover:text-white"><Settings size={16} /></button>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => loadAppData()} 
              className={`bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-all ${isSyncing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setIsUserSelectorOpen(true)} className="bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-all">
              <RotateCcw size={14} />
            </button>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[100px] ml-1">{currentUser?.name || 'HOTEL STAFF'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3 pb-24">
        {view === 'dashboard' && (
          <div className="space-y-3 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Stock Value" value={`₱${(stockValue / 1000).toFixed(1)}K`} icon={<Sparkles size={10}/>} />
              <StatCard label="Pending" value={pendingIssues?.length || 0} icon={<ClipboardList size={10}/>} />
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border shadow-sm border-gray-100">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Operation Centers</h4>
              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  onClick={() => setIsAddingItem(true)} 
                  className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 group active:scale-95 transition-all"
                >
                  <div className="p-2.5 bg-white rounded-xl text-emerald-600 shadow-sm"><PlusCircle size={20}/></div>
                  <span className="text-[9px] font-black uppercase text-emerald-900 tracking-wider">Stock Inbound</span>
                </button>

                <button 
                  onClick={() => setView('inventory')} 
                  className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 group active:scale-95 transition-all"
                >
                  <div className="p-2.5 bg-white rounded-xl text-blue-600 shadow-sm"><Search size={20}/></div>
                  <span className="text-[9px] font-black uppercase text-blue-900 tracking-wider">Issue</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border shadow-sm border-gray-100">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Audits & Tools</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={showLowParReport} className="flex items-center gap-2.5 p-3 bg-purple-50 rounded-xl border border-purple-100 active:scale-95 transition-all">
                  <div className="p-2 bg-white rounded-lg text-purple-600 shadow-sm"><TrendingDown size={14}/></div>
                  <p className="text-[9px] font-black uppercase text-purple-900 leading-tight">Low Stock</p>
                </button>
                <button onClick={() => loadAppData()} className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-100 active:scale-95 transition-all">
                  <div className={`p-2 bg-white rounded-lg text-blue-600 shadow-sm ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw size={14}/></div>
                  <p className="text-[9px] font-black uppercase text-blue-900 leading-tight">Sync Data</p>
                </button>
                                <button onClick={generateReorderList} className="flex items-center gap-2.5 p-3 bg-red-50 rounded-xl border border-red-100 active:scale-95 transition-all">
                  <div className="p-2 bg-white rounded-lg text-red-600 shadow-sm"><ShoppingCart size={14}/></div>
                  <p className="text-[9px] font-black uppercase text-red-900 leading-tight">Reorder</p>
                </button>

                <button onClick={showNearExpiryReport} className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100 active:scale-95 transition-all">
                  <div className="p-2 bg-white rounded-lg text-amber-600 shadow-sm"><CalendarClock size={14}/></div>
                  <p className="text-[9px] font-black uppercase text-amber-900 leading-tight">Near Exp</p>
                </button>

                <button onClick={handleToggleAudit} className={`flex items-center gap-2.5 p-3 rounded-xl border active:scale-95 transition-all ${
                  isAuditMode
                    ? 'bg-green-100 border-green-200'
                    : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className={`p-2 bg-white rounded-lg shadow-sm ${isAuditMode ? 'text-green-600' : 'text-gray-600'}`}><FileText size={14}/></div>
                  <p className={`text-[9px] font-black uppercase leading-tight ${isAuditMode ? 'text-green-900' : 'text-gray-900'}`}>{isAuditMode ? 'Exit Audit' : 'Audit Mode'}</p>
                </button>

                {isAuditMode && (
                  <button onClick={handleExportAuditToXLSX} className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100 active:scale-95 transition-all col-span-2">
                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm"><FileOutput size={14}/></div>
                    <p className="text-[9px] font-black uppercase text-emerald-900 leading-tight">Export Audit Report</p>
                  </button>
                )}
                
                <button onClick={() => setView('history')} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100 active:scale-95 transition-all">
                  <div className="p-2 bg-white rounded-lg text-gray-600 shadow-sm"><History size={14}/></div>
                  <p className="text-[9px] font-black uppercase text-gray-900 leading-tight">Logs</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <div className="flex flex-col gap-3 sticky top-0 bg-[#f9fafb] z-10 -mx-3 px-3 pb-3 pt-1">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Search className="text-gray-400" size={24} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search SKU or Name..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full pl-14 pr-4 py-5 bg-gray-100 border-none rounded-2xl text-2xl font-black outline-none focus:ring-2 focus:ring-[#800000]/5 transition-all uppercase placeholder:normal-case placeholder:font-bold placeholder:text-gray-400 shadow-inner" 
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                   <button 
                     onClick={() => setSelectedCategory(GLOBAL_CATEGORY_KEY)} 
                     className={`shrink-0 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                       selectedCategory === GLOBAL_CATEGORY_KEY 
                       ? 'bg-[#800000] text-white shadow-lg' 
                       : 'bg-white text-gray-400 border border-gray-100'
                     }`}
                   >
                     All Items
                   </button>
                   {(availableCategories || []).map(cat => (
                     <button 
                       key={cat} 
                       onClick={() => setSelectedCategory(cat)} 
                       className={`shrink-0 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                         selectedCategory === cat 
                         ? 'bg-[#800000] text-white shadow-lg' 
                         : 'bg-white text-gray-400 border border-gray-100'
                       }`}
                     >
                       {cat}
                     </button>
                   ))}
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-2.5 mt-1">
               {(filteredInventory || []).map(item => (
                 <ItemCard 
                    key={item.id} 
                    item={item} 
                    selectedZone={selectedZone as Zone} 
                    onIssue={(i, q, forcedZone) => {
                      if (isGuest) return;
                      setCart(prev => {
                        const existing = (prev || []).find(p => p.itemId === i.id);
                        if (existing) return (prev || []).map(p => p.itemId === i.id ? { ...p, quantity: p.quantity + q } : p);
                        const targetZone = forcedZone || (selectedZone === GLOBAL_ZONE_KEY ? (availableZones[0] || Zone.MAIN) : selectedZone);
                        return [...(prev || []), { itemId: i.id, sku: i.sku, name: i.name, quantity: q, zone: targetZone, uom: i.uom }];
                      });
                      notify("Added to Cart");
                    }} 
                    onEdit={(i) => { if (!isGuest) setIsEditingItem(i); }} 
                    isAuditMode={isAuditMode}
                    auditCount={auditCounts[item.id]}
                    onAuditCountChange={handleAuditCountChange}
                 />
               ))}
               {filteredInventory?.length === 0 && <div className="py-24 text-center text-gray-200 uppercase font-black text-[10px] tracking-[0.2em]">No registry matches found</div>}
             </div>
          </div>
        )}

        {view === 'pending' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <div className="text-center mb-4 pt-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Release Queue</h3>
             </div>
             {(pendingIssues || []).map(req => (
               <div key={req.id} className="bg-white border rounded-2xl p-4 shadow-sm border-gray-100 relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{req.id}</p>
                      <h4 className="text-[13px] font-black text-gray-900 uppercase">{req.department}</h4>
                      <p className="text-[9px] font-bold text-gray-400 mt-0.5">{new Date(req.timestamp).toLocaleDateString()} at {new Date(req.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <button 
                      onClick={() => handleDeletePending(req.id)} 
                      className="text-gray-300 hover:text-red-500 p-2.5 transition-colors active:scale-95"
                      title="Remove from queue"
                    >
                      <Trash2 size={20}/>
                    </button>
                  </div>
                  <div className="space-y-1 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {(req.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px]">
                         <span className="font-bold text-gray-700 truncate pr-4 uppercase">{item.name}</span>
                         <span className="font-black text-[#800000] shrink-0">{item.quantity} {item.uom}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    disabled={isGuest}
                    onClick={() => { setActiveRequestToFinalize(req); setIsFinalizingIssue(true); }}
                    className="w-full py-4 bg-[#800000] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    <ShieldCheck size={14} /> Finalize Release
                  </button>
               </div>
             ))}
             {pendingIssues?.length === 0 && <div className="py-24 text-center text-gray-200 uppercase font-black text-[9px] tracking-widest">Queue is clear</div>}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-center mb-1 pt-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Activity Logs</h3>
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setHistoryTab('logs')}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${historyTab === 'logs' ? 'bg-white text-[#800000] shadow-sm' : 'text-gray-400'}`}
                    >
                      Logs
                    </button>
                    <button 
                      onClick={() => setHistoryTab('receipts')}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${historyTab === 'receipts' ? 'bg-white text-[#800000] shadow-sm' : 'text-gray-400'}`}
                    >
                      Receipts
                    </button>
                  </div>
                  <select 
                    value={logDeptFilter} 
                    onChange={e => setLogDeptFilter(e.target.value)}
                    className="bg-white border rounded-xl px-2 py-2 text-[9px] font-black uppercase outline-none focus:border-[#800000]"
                  >
                    <option value="All">All Departments</option>
                    {(availableDepartments || []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
             </div>

             {historyTab === 'logs' ? (
               <div className="bg-white border rounded-2xl overflow-hidden shadow-sm border-gray-100">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-gray-50 text-[8px] font-black uppercase tracking-widest text-gray-400 border-b">
                      <tr>
                        <th className="px-4 py-3">Transaction</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(filteredLogs || []).map(t => (
                        <tr key={t.id} className="active:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                               <p className="font-black text-gray-900 truncate max-w-[150px] uppercase">{t.itemName}</p>
                               <p className="text-[7px] font-bold text-gray-300 uppercase tracking-tighter">
                                 {t.action} • {t.department?.slice(0, 10) || 'Warehouse'} • {new Date(t.timestamp).toLocaleDateString()}
                               </p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-black text-[#800000]">
                            {t.action === 'RECEIVE' ? '+' : '-'}{t.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLogs?.length === 0 && <div className="py-20 text-center text-gray-200 uppercase font-black text-[9px]">No records found</div>}
               </div>
             ) : (
               <div className="space-y-3">
                 {(releasedIssues || [])
                   .filter(r => logDeptFilter === 'All' || r.department === logDeptFilter)
                   .map(receipt => (
                     <div key={receipt.id} className="bg-white border rounded-2xl p-4 shadow-sm border-gray-100 flex justify-between items-center group">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{receipt.id}</span>
                           {receipt.signature && <Shield size={10} className="text-green-500" />}
                         </div>
                         <h4 className="text-[11px] font-black text-gray-900 uppercase leading-none mb-1">{receipt.department}</h4>
                         <p className="text-[8px] font-bold text-gray-400 uppercase">
                           {receipt.receiverName || 'N/A'} • {receipt.items.length} items • {new Date(receipt.timestamp).toLocaleDateString()}
                         </p>
                       </div>
                       <div className="flex gap-2">
                         <button 
                           onClick={() => exportReceiptAsImage(receipt)}
                           className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-[#800000] active:scale-95 transition-all"
                           title="Export Receipt Image"
                         >
                           <FileOutput size={16} />
                         </button>
                       </div>
                     </div>
                   ))}
                 {(releasedIssues || []).filter(r => logDeptFilter === 'All' || r.department === logDeptFilter).length === 0 && (
                   <div className="py-20 text-center text-gray-200 uppercase font-black text-[9px]">No receipts found</div>
                 )}
               </div>
             )}

             {isStaff && (transactions?.length || 0) > 0 && (
                <div className="flex gap-2">
                  <button onClick={handleClearHistory} className="flex-1 py-3 border border-red-50 text-red-300 rounded-xl text-[9px] font-black uppercase tracking-widest active:bg-red-50 transition-colors">Wipe System Logs</button>
                  <button onClick={() => setIsExportModalOpen(true)} className="flex-1 py-3 border border-blue-50 text-blue-300 rounded-xl text-[9px] font-black uppercase tracking-widest active:bg-blue-50 transition-colors">Export Receipts</button>
                </div>
             )}
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-300 pb-10">
            <div className="text-center pt-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">System Admin</h3>
            </div>

            {/* Turso Database Engine Section */}
            <div className="bg-white rounded-[1.5rem] border shadow-sm p-6 space-y-4 border-gray-100">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#800000]" />
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Database Engine</h4>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : (dbStatus.connected ? 'bg-green-500' : 'bg-red-500')}`}></div>
                  <span className={`text-[7px] font-black uppercase ${isSyncing ? 'text-amber-600' : (dbStatus.connected ? 'text-green-600' : 'text-red-600')}`}>
                    {isSyncing ? 'Syncing...' : (dbStatus.connected ? 'Live (Turso)' : 'Disconnected')}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {dbStatus.error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                    <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                    <p className="text-[8px] font-bold text-red-800 uppercase leading-tight">{dbStatus.error}</p>
                  </div>
                )}
                
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all" onClick={() => setIsCloudSetupOpen(true)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl text-[#800000] shadow-sm"><Cloud size={18} /></div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1">Configure Cloud Sync</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Edge SQLite Integration</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#800000] transition-colors" />
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if(!isStaff) return;
                      await loadAppData();
                    }}
                    disabled={!isStaff || isSyncing}
                    className="flex-1 py-4 bg-gray-50 rounded-xl border border-gray-100 text-[9px] font-black uppercase text-blue-600 active:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Pull Cloud Data
                  </button>
                  <button 
                    onClick={handleForcePushSync}
                    disabled={!isStaff || isSyncing}
                    className="flex-1 py-4 bg-gray-50 rounded-xl border border-gray-100 text-[9px] font-black uppercase text-[#800000] active:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UploadCloud size={14} /> Push to Cloud
                  </button>
                </div>

                <button 
                  onClick={async () => {
                    if(!isStaff) return;
                    setIsSyncing(true);
                    const test = await db.testConnection();
                      if (test.success) {
                        setDbStatus({ connected: true });
                        notify("Connection Successful");
                      } else {
                        setDbStatus({ connected: false, error: test.error });
                        notifyError(`Test Failed: ${test.error}`);
                      }
                    setIsSyncing(false);
                    if (test.success) {
                      setDbStatus({ connected: true });
                      notify("Connection Verified");
                    } else {
                      setDbStatus({ connected: false, error: test.error });
                      notifyError("Test Failed: Check Credentials");
                    }
                  }}
                  disabled={!isStaff || isSyncing}
                  className="w-full py-3.5 bg-white rounded-xl border border-gray-100 text-[9px] font-black uppercase text-gray-400 active:bg-gray-50 transition-all shadow-sm"
                >
                  Test Server Connection
                </button>


              </div>
            </div>

            <div className="bg-white rounded-[1.5rem] border shadow-sm p-6 space-y-4 border-gray-100">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#800000]" />
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Security</h4>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={async () => {
                    const newPw = prompt("Enter New Shared Password:");
                    if(newPw) {
                      await db.setAdminPassword(newPw);
                      notify("Shared Password Updated");
                    }
                  }}
                  className="w-full py-4 bg-gray-50 rounded-2xl border border-gray-100 text-[9px] font-black uppercase text-[#800000] active:bg-red-50 transition-all font-black"
                >
                  Change Shared Staff Password
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[1.5rem] border shadow-sm p-6 space-y-4 border-gray-100">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <FileOutput size={16} className="text-[#800000]" />
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Data Export</h4>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full py-4 bg-gray-50 rounded-2xl border border-gray-100 text-[9px] font-black uppercase text-blue-600 active:bg-blue-50 transition-all font-black flex items-center justify-center gap-2"
                >
                  <FileOutput size={14} /> Export Issue Receipts (CSV)
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[1.5rem] border shadow-sm p-6 space-y-4 border-gray-100">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-[#800000]" />
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Inventory Setup</h4>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                   <label className="text-[8px] font-black text-gray-300 uppercase block mb-1.5 ml-1">Unit Departments</label>
                   <div className="flex flex-wrap gap-1.5">
                      {(availableDepartments || []).map(d => (
                        <div key={d} className="flex items-center gap-1.5 bg-gray-50 border px-2.5 py-1.5 rounded-xl text-[9px] font-bold">
                          {d} {isStaff && <button onClick={() => handleUpdateConfig('departments', availableDepartments.filter(x => x !== d))} className="text-gray-300 hover:text-red-500 transition-colors"><X size={10}/></button>}
                        </div>
                      ))}
                      <button disabled={!isStaff} onClick={() => { const n = prompt("Dept Name:"); if(n) handleUpdateConfig('departments', [...availableDepartments, n]); }} className="p-1 text-[#800000] disabled:opacity-30"><PlusCircle size={18}/></button>
                   </div>
                </div>
                <div>
                   <label className="text-[8px] font-black text-gray-300 uppercase block mb-1.5 ml-1">Classifications</label>
                   <div className="flex flex-wrap gap-1.5">
                      {(availableCategories || []).map(c => (
                        <div key={c} className="flex items-center gap-1.5 bg-gray-50 border px-2.5 py-1.5 rounded-xl text-[9px] font-bold">
                          {c} {isStaff && <button onClick={() => handleUpdateConfig('categories', availableCategories.filter(x => x !== c))} className="text-gray-300 hover:text-red-500 transition-colors"><X size={10}/></button>}
                        </div>
                      ))}
                      <button disabled={!isStaff} onClick={() => { const n = prompt("Category Name:"); if(n) handleUpdateConfig('categories', [...availableCategories, n]); }} className="p-1 text-[#800000] disabled:opacity-30"><PlusCircle size={18}/></button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Requisition Form Scanner Overlay */}


      {/* Turso Cloud Setup Modal */}
      {isCloudSetupOpen && (
        <div className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[400px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 border-2 border-blue-600 rounded-xl text-blue-600">
                  <Database size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-blue-600 leading-none mb-1">Turso Cloud Setup</h2>
                  <p className="text-[7px] font-black uppercase tracking-[0.2em] text-blue-400">Edge SQLite Integration</p>
                </div>
              </div>
              <button onClick={() => setIsCloudSetupOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 no-scrollbar">
              {/* Info Box */}
              <div className="bg-blue-50/50 p-4 rounded-2xl flex gap-3 border border-blue-100/50">
                <div className="shrink-0 pt-0.5">
                  <Cloud size={20} className="text-blue-500" strokeWidth={2.5} />
                </div>
                <p className="text-[10px] font-black uppercase leading-[1.6] text-blue-800 tracking-wide">
                  Configure Turso for real-time warehouse synchronization.
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Database URL</label>
                  <input 
                    type="text" 
                    value={tursoUrl}
                    onChange={e => setTursoUrl(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-xs text-gray-700 focus:border-blue-500 outline-none shadow-sm transition-all"
                    placeholder="libsql://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Auth Token</label>
                  <input 
                    type="password" 
                    value={tursoToken}
                    onChange={e => setTursoToken(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg tracking-[0.2em] text-gray-700 focus:border-blue-500 outline-none shadow-sm transition-all"
                  />
                </div>
              </div>

              <a 
                href="https://turso.tech/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-blue-600 border-b-2 border-blue-100 pb-1 hover:border-blue-600 transition-all ml-1"
              >
                Get Credentials from Turso CLI/Dashboard <ExternalLink size={10} />
              </a>

              <div className="pt-2">
                <button 
                  onClick={handleCloudDisconnect}
                  className="w-full py-4 border-2 border-red-50 text-red-500 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-red-50 active:scale-95 transition-all"
                >
                  Disconnect Cloud Storage
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50/50 flex items-center justify-between shrink-0">
              <button 
                onClick={() => setIsCloudSetupOpen(false)}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-4 py-2"
              >
                Back
              </button>
              <button 
                onClick={handleCloudConnect}
                disabled={isConnecting}
                className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isConnecting ? <><Loader2 className="animate-spin" size={16} /> Connecting...</> : <><RefreshCw size={16} strokeWidth={3} /> Connect & Sync</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report / Audit Modal */}
      {reportModal.open && (
        <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-lg rounded-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
               <div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">{reportModal.title}</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase">{reportModal.items?.length || 0} items identified</p>
               </div>
               <button onClick={() => setReportModal({ ...reportModal, open: false })} className="p-2 bg-gray-50 rounded-xl text-gray-400"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-4">
              {(reportModal.items || []).map(item => (
                <div key={item.id} className="p-4 bg-gray-50 border rounded-2xl flex flex-col gap-3 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1.5">{item.name}</p>
                      {reportModal.title === 'Reorder List' && (
                        <p className="text-[8px] font-bold text-gray-400 uppercase">
                          {item.currentStock} / {item.dynamicPar} {item.uom} | REORDER: {item.reorderQty}
                        </p>
                      )}
                    </div>
                    <div className={`text-[10px] font-black ${item.earliestExpiry !== '2099-12-31' ? 'text-amber-600' : 'text-gray-300'}`}>
                      {item.earliestExpiry === '2099-12-31' ? 'INF' : new Date(item.earliestExpiry).toLocaleDateString()}
                    </div>
                  </div>
                  {item.batches && item.batches.filter(b => b.quantity > 0).length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-200/60">
                      {item.batches
                        .filter(b => b.quantity > 0)
                        .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())
                        .map(batch => {
                          const diffDays = Math.ceil((new Date(batch.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          const isExpiringSoon = batch.expiry !== '2099-12-31' && diffDays <= 90;
                          const isExpired = batch.expiry !== '2099-12-31' && diffDays <= 0;
                          
                          return (
                            <div key={batch.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-gray-500 uppercase">{batch.quantity} {item.uom}</span>
                                <span className="text-[8px] font-black text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded-md">{batch.zone.split(' ')[0]}</span>
                              </div>
                              <span className={`text-[9px] font-black ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-600' : 'text-gray-400'}`}>
                                {batch.expiry === '2099-12-31' ? 'INF' : `${diffDays} day${diffDays === 1 ? '' : 's'}`}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ))}
              {reportModal.items?.length === 0 && <div className="py-20 text-center text-gray-200 uppercase font-black text-[9px]">No matches found</div>}
            </div>

            <div className="pt-4 border-t flex gap-3">
              <button 
                disabled={reportModal.items?.length === 0}
                onClick={() => exportReportToCSV(reportModal.title, reportModal.items)}
                className="flex-1 py-4 bg-[#800000] text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-20"
              >
                <FileOutput size={16} /> Export to CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Receipts Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Export Receipts</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-300"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Start Date</label>
                <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#800000] font-bold text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">End Date</label>
                <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#800000] font-bold text-sm" />
              </div>
              <button 
                onClick={handleExportReceipts}
                className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all mt-4"
              >
                Generate CSV Report
              </button>
              <button 
                onClick={handleExportVisualReceipts}
                className="w-full py-4 bg-[#800000] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Generate Visual PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditingItem && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-2 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white w-full max-w-[340px] rounded-3xl p-4 space-y-3 animate-in zoom-in-95 my-auto shadow-2xl">
              <div className="flex justify-between items-start border-b border-gray-50 pb-2">
                <div>
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-[#800000]">SYSTEM REGISTRY</h3>
                  <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">SKU: {isEditingItem.sku}</p>
                </div>
                <button onClick={() => setIsEditingItem(null)} className="text-gray-300 p-1"><X size={18}/></button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar py-1">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400 ml-1">REGISTRY NAME</label>
                    <input type="text" value={isEditingItem.name} onChange={e => setIsEditingItem({...isEditingItem, name: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-base outline-none focus:border-[#800000] shadow-sm" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-gray-400 ml-1">CLASSIFICATION</label>
                       <select value={isEditingItem.category} onChange={e => setIsEditingItem({...isEditingItem, category: e.target.value})} className="w-full px-2 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-sm uppercase focus:border-[#800000] outline-none shadow-sm">
                          {(availableCategories || []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-gray-400 ml-1">UOM</label>
                       <input type="text" value={isEditingItem.uom} onChange={e => setIsEditingItem({...isEditingItem, uom: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-sm focus:border-[#800000] outline-none uppercase shadow-sm" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-gray-400 ml-1">SAFETY PAR</label>
                       <input type="number" value={isEditingItem.parStock} onChange={e => setIsEditingItem({...isEditingItem, parStock: Number(e.target.value)})} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg focus:border-[#800000] outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-gray-400 ml-1">BASE COST</label>
                       <input type="number" value={isEditingItem.unitCost} onChange={e => setIsEditingItem({...isEditingItem, unitCost: Number(e.target.value)})} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg focus:border-[#800000] outline-none shadow-sm" />
                    </div>
                 </div>

                 <div className="space-y-2 pt-2 border-t border-gray-50">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-[#800000]">ACTIVE STOCK BATCHES</h4>
                    {(isEditingItem.batches || []).map((batch, idx) => (
                      <div key={batch.id} className="bg-gray-50 p-3 rounded-2xl space-y-2 border border-gray-100 relative shadow-sm">
                        <div className="flex justify-between items-center px-1">
                           <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">BATCH REF: {batch.id.split('-').pop()}</span>
                           <button onClick={() => setIsEditingItem({ ...isEditingItem, batches: (isEditingItem.batches || []).filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-1">
                             <label className="text-[7px] font-black text-gray-400 uppercase ml-1">QTY</label>
                             <input type="number" value={batch.quantity} onChange={e => {
                                 const updated = [...(isEditingItem.batches || [])];
                                 updated[idx] = { ...batch, quantity: Number(e.target.value) };
                                 setIsEditingItem({ ...isEditingItem, batches: updated });
                               }} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-lg font-black outline-none focus:border-[#800000]" />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[7px] font-black text-gray-400 uppercase ml-1">ZONE</label>
                             <select value={batch.zone} onChange={e => {
                                 const updated = [...(isEditingItem.batches || [])];
                                 updated[idx] = { ...batch, zone: e.target.value };
                                 setIsEditingItem({ ...isEditingItem, batches: updated });
                               }} className="w-full px-2 py-2 bg-white border border-gray-100 rounded-xl text-sm font-black outline-none uppercase">
                               {(availableZones || []).map(z => <option key={z} value={z}>{z.split(' (')[0]}</option>)}
                             </select>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[7px] font-black text-gray-400 uppercase ml-1">EXPIRY DATE</label>
                           <input type="date" value={batch.expiry === '2099-12-31' ? '' : batch.expiry} onChange={e => {
                               const updated = [...(isEditingItem.batches || [])];
                               updated[idx] = { ...batch, expiry: e.target.value || '2099-12-31' };
                               setIsEditingItem({ ...isEditingItem, batches: updated });
                             }} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm font-black outline-none" />
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setIsEditingItem({ ...isEditingItem, batches: [...(isEditingItem.batches || []), { id: `BAT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, expiry: '2099-12-31', quantity: 0, zone: availableZones[0] }] })}
                      className="w-full py-3 border border-dashed border-gray-200 rounded-2xl text-[9px] font-black text-gray-400 uppercase active:bg-gray-50 tracking-widest">+ MANUAL ENTRY</button>
                 </div>
              </div>

              <div className="pt-2 space-y-3">
                 <button onClick={handleEditItemSubmit} className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Save size={16}/> SAVE REGISTRY
                 </button>
                 <div className="p-2 bg-gray-50 rounded-2xl border border-gray-100/50">
                   <button 
                    onClick={handleDeleteItem} 
                    className="w-full py-3 bg-[#fff5f5] text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:bg-red-50 transition-all border border-red-100/30 shadow-sm"
                   >
                      <Trash2 size={16}/> PERMANENT WIPE
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Navigation Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-around h-16 pb-safe z-[100] shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        {[ 
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' }, 
          { id: 'inventory', icon: Package, label: 'Stock' }, 
          { id: 'pending', icon: ClipboardList, label: 'Queue' }, 
          { id: 'history', icon: History, label: 'Logs' },
          { id: 'settings', icon: Settings, label: 'Admin' }
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id as 'dashboard' | 'inventory' | 'pending' | 'history' | 'settings')} 
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all relative ${view === item.id ? 'text-[#800000]' : 'text-gray-300'}`}
          >
            {item.id === 'pending' && (pendingIssues?.length || 0) > 0 && (
              <span className="absolute top-2 right-[30%] bg-red-500 text-white text-[7px] font-black min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-white">
                {pendingIssues?.length}
              </span>
            )}
            <item.icon size={20} strokeWidth={view === item.id ? 2.5 : 2} />
            <span className="text-[7px] font-black uppercase tracking-tighter">{item.label}</span>
            {view === item.id && <div className="absolute bottom-1 w-1 h-1 bg-[#800000] rounded-full" />}
          </button>
        ))}
        <button onClick={() => setIsCartOpen(true)} className={`flex flex-col items-center justify-center gap-0.5 w-full h-full relative ${(cart?.length || 0) > 0 ? 'text-[#800000]' : 'text-gray-300'}`}>
          <div className="relative">
            <ShoppingCart size={20} strokeWidth={(cart?.length || 0) > 0 ? 2.5 : 2} />
            {(cart?.length || 0) > 0 && <span className="absolute -top-1.5 -right-1.5 bg-[#800000] text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">{cart.length}</span>}
          </div>
          <span className="text-[7px] font-black uppercase tracking-tighter">Cart</span>
        </button>
      </footer>

      {/* Cart Drawer */}
      {showAuditExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">End Audit Session?</h3>
              <p className="text-sm text-gray-500 font-medium mb-6">
                This will clear all your entered counts. Make sure you have exported your report if needed.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAuditExitConfirm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmExitAudit}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                >
                  End Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[2100] bg-black/40 backdrop-blur-[2px] flex justify-end">
           <div className="bg-white w-full max-w-[340px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
              <div className="p-5 border-b flex justify-between items-center bg-[#800000] text-white shrink-0">
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Draft({cart?.length || 0})</h3>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setIsRequestPickerOpen(true)} className="p-1" title="Pick Request"><FileText size={22}/></button>
                    <button onClick={() => setIsCartOpen(false)} className="p-1"><X size={22}/></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-gray-50/30">
                {(cart || []).map((item, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[12px] text-gray-800 uppercase truncate pr-4">{item.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                        {item.zone?.split(' (')[0] || Zone.MAIN} • {item.quantity} {item.uom}
                      </p>
                    </div>
                    <button onClick={() => setCart(prev => (prev || []).filter((_, i) => i !== idx))} className="text-gray-200 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {cart?.length === 0 && <div className="py-20 text-center text-gray-200 uppercase font-black text-[9px] tracking-widest">Draft is empty</div>}
              </div>
              <div className="p-5 border-t bg-white pb-safe space-y-3">
                <button 
                  disabled={cart?.length === 0} 
                  onClick={() => { setCheckoutMode('release'); setIsCheckingOut(true); }} 
                  className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} /> Final Release
                </button>
                <button 
                  disabled={cart?.length === 0} 
                  onClick={() => { setCheckoutMode('queue'); setIsCheckingOut(true); }} 
                  className="w-full py-4 border-2 border-[#800000] text-[#800000] rounded-2xl font-black uppercase tracking-widest text-[11px] disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Queue for Later
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Request Picker Modal */}
      {isRequestPickerOpen && (
        <div className="fixed inset-0 z-[2200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-lg rounded-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Select Request</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase">{(externalRequests || []).filter(r => r.status === 'pending' || r.status === 'in progress').length} pending requests</p>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => loadAppData()} className={`p-2 bg-gray-50 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors ${isSyncing ? 'animate-spin' : ''}`} title="Sync Requests">
                    <RefreshCw size={20}/>
                  </button>
                  <button onClick={() => setIsRequestPickerOpen(false)} className="p-2 bg-gray-50 rounded-xl text-gray-400"><X size={20}/></button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
              {(externalRequests || []).filter(r => r.status === 'pending' || r.status === 'in progress').map(req => (
                <div key={req.id} className={`bg-gray-50 border rounded-2xl overflow-hidden transition-all ${req.status === 'in progress' ? 'border-blue-200' : ''}`}>
                  <div 
                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{req.id}</span>
                          <span className="text-[8px] font-bold text-gray-300 uppercase">• {new Date(req.timestamp).toLocaleDateString()}</span>
                          {req.status === 'in progress' && (
                            <span className="text-[7px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">In Progress</span>
                          )}
                      </div>
                      <p className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1">{req.department}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                        {req.user} • {req.items.length} items
                      </p>
                    </div>
                    <div className="text-gray-400">
                      {expandedRequestId === req.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                  
                  {expandedRequestId === req.id && (
                    <div className="bg-white border-t border-gray-100 p-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2 mb-4">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Requested Items</h4>
                        {req.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] py-1 border-b border-gray-50 last:border-0">
                            <span className="font-bold text-gray-700 uppercase">{item.name}</span>
                            <span className="font-black text-[#800000]">{item.quantity} {item.uom}</span>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={async () => {
                          const consolidated: CartItem[] = [];
                          const normalize = (s: string) => (s || '').trim().toLowerCase();
                          
                          req.items.forEach(item => {
                            const invItem = inventory.find(i => 
                              normalize(i.name) === normalize(item.name) || 
                              (item.sku && normalize(i.sku) === normalize(item.sku))
                            );
                            
                            const correctId = invItem ? invItem.id : item.itemId;
                            const correctName = invItem ? invItem.name : item.name;
                            const correctSku = invItem ? invItem.sku : item.sku;
                            const correctUom = invItem ? invItem.uom : item.uom;
                            
                            const existing = consolidated.find(c => c.itemId === correctId);
                            if (existing) {
                              existing.quantity += item.quantity;
                            } else {
                              consolidated.push({ 
                                ...item, 
                                itemId: correctId,
                                name: correctName,
                                sku: correctSku,
                                uom: correctUom
                              });
                            }
                          });

                          try {
                            // Update external status to In Progress
                            await db.updateExternalRequestStatus(req.id, 'In Progress');
                            setActiveExternalRequestId(req.id);
                            setCart(consolidated);
                            setReceiverDept(req.department);
                            setIsRequestPickerOpen(false);
                            setIsCartOpen(true);
                            notify("Request Loaded & Marked In Progress");
                            loadAppData(true); // Refresh to show updated status
                          } catch {
                            notifyError("Failed to update request status");
                          }
                        }}
                        className="w-full py-3 bg-[#800000] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <FileText size={14} /> Pick Request & Load to Cart
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {externalRequests?.length === 0 && <div className="py-20 text-center text-gray-200 uppercase font-black text-[9px]">No pending requests</div>}
            </div>
          </div>
        </div>
      )}

      {/* Release Selection Modal */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-[2200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-sm:w-[95%] max-w-sm rounded-[2rem] p-6 space-y-6 shadow-2xl">
            <div className="text-center"><h3 className="text-xs font-black uppercase tracking-widest text-[#800000]">{checkoutMode === 'release' ? 'Release Now' : 'Queue Request'}</h3></div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-300 ml-1">Destination Unit</label>
                <select value={receiverDept} onChange={e => setReceiverDept(e.target.value)} className="w-full p-4 border rounded-xl outline-none focus:border-[#800000] font-black uppercase text-[11px] bg-gray-50 border-gray-100">
                  {(availableDepartments || []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setIsCheckingOut(false)} className="py-3.5 border text-gray-400 font-black uppercase text-[9px] rounded-xl border-gray-100">Cancel</button>
              <button onClick={handleQueueRequest} className="py-3.5 bg-[#800000] text-white font-black uppercase text-[9px] rounded-xl shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                <CheckCircle2 size={12}/> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-4 space-y-4 animate-in zoom-in-95 my-auto relative">
             <div className="flex justify-between items-center border-b pb-3">
               <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><PlusCircle size={16}/></div>
                 <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">Inbound Stock</h3>
               </div>
               <button onClick={() => { setIsAddingItem(false); setShowSuggestions(false); }} className="text-gray-300"><X size={20}/></button>
             </div>
             
             <div className="space-y-3.5">
               <div className="space-y-1 relative">
                  <label className="text-[8px] font-black uppercase text-gray-300 ml-1 flex items-center gap-1">
                    <Search size={8} /> Item Search / Name
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Enter name..." 
                      value={newItemData.name} 
                      onFocus={() => { if(itemSuggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
                      onChange={e => {
                        const val = e.target.value;
                        setNewItemData({...newItemData, name: val});
                        if (val.length > 1) {
                          const matches = inventory.filter(i => 
                            (i.name || '').toLowerCase().includes(val.toLowerCase()) || 
                            (i.sku || '').toLowerCase().includes(val.toLowerCase())
                          ).slice(0, 5);
                          setItemSuggestions(matches);
                          setShowSuggestions(matches.length > 0);
                        } else {
                          setItemSuggestions([]);
                          setShowSuggestions(false);
                        }
                      }} 
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:border-[#800000] text-xs shadow-sm pr-10" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                      <Search size={18} />
                    </div>
                  </div>
                  
                  {showSuggestions && itemSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[2005] bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {itemSuggestions.map(item => (
                        <button
                          key={item.id}
                          onMouseDown={() => {
                            setNewItemData(prev => ({ 
                              ...prev, 
                              name: item.name, 
                              uom: item.uom, 
                              category: item.category, 
                              sku: item.sku, 
                              unitCost: item.unitCost, 
                              parStock: item.parStock 
                            }));
                            setItemSuggestions([]);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-4 flex flex-col items-start hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-50 text-left group"
                        >
                          <span className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1.5 group-hover:text-[#800000] transition-colors">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded">SKU: {item.sku}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.uom}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-300 ml-1">Quantity</label>
                    <input type="number" value={newItemData.receivedQty || ''} onChange={e => setNewItemData({...newItemData, receivedQty: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-xs outline-none focus:border-[#800000]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-300 ml-1">UOM</label>
                    <input type="text" placeholder="Units" value={newItemData.uom} onChange={e => setNewItemData({...newItemData, uom: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-xs outline-none focus:border-[#800000]" />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-300 ml-1">Expiration</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <input type="date" disabled={newItemData.notExpiring} value={newItemData.expiryDate} onChange={e => setNewItemData({...newItemData, expiryDate: e.target.value})} className="flex-1 bg-transparent font-black outline-none text-[12px] disabled:opacity-20 uppercase" />
                    <label className="flex items-center gap-2 select-none shrink-0 cursor-pointer">
                      <input type="checkbox" checked={newItemData.notExpiring} onChange={e => setNewItemData({...newItemData, notExpiring: e.target.checked})} className="w-5 h-5 rounded text-[#800000] accent-[#800000]" />
                      <span className="text-[9px] font-black uppercase text-gray-400">None</span>
                    </label>
                  </div>
               </div>
             </div>
             
             <button onClick={handleAddItemSubmit} className="w-full py-4 bg-[#800000] text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-[0.98] transition-all shadow-lg mt-2">Finalize Admission</button>
          </div>
        </div>
      )}

      {/* Signature & Finalize Modal */}
      {isFinalizingIssue && (
        <div className="fixed inset-0 z-[2200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div><h3 className="text-xs font-black uppercase tracking-widest text-[#800000]">Authentication</h3><p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{activeRequestToFinalize?.department}</p></div>
              <button onClick={() => setIsFinalizingIssue(false)} className="text-gray-400"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-300 ml-1">Personnel Name</label>
                <input type="text" placeholder="Print Name Clearly" value={receiverName} onChange={e => setReceiverName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#800000] font-black uppercase text-xs shadow-inner" />
              </div>
              <SignaturePad onSave={setSignature} onClear={() => setSignature(null)} />
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button onClick={() => setIsFinalizingIssue(false)} className="flex-1 py-3 border text-gray-400 font-black uppercase text-[9px] rounded-xl border-gray-100">Cancel</button>
              <button disabled={!signature || !receiverName} onClick={handleFinalRelease} className="flex-1 py-3 bg-[#800000] text-white font-black uppercase text-[9px] rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-20 transition-all">
                <Save size={14}/> Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invisible Receipt for Export */}
      {receiptToExport && (
        <div id={`receipt-${receiptToExport.id}`} style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '0', 
          background: 'white', 
          width: '600px', 
          fontFamily: 'Montserrat, sans-serif', 
          zIndex: -1,
          boxSizing: 'border-box',
          minHeight: '800px',
          display: 'flex',
          flexDirection: 'column',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          margin: 0,
          color: '#000',
          overflow: 'hidden' /* Ensure no overflow */
        }}>
          <div style={{ padding: '60px 40px', width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
          <div style={{ 
            backgroundColor: '#800000', 
            padding: '40px 20px 20px 20px', 
            color: '#FFFF00', 
            textAlign: 'center', 
            marginBottom: '50px',
            position: 'relative',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            width: '100%',
            boxSizing: 'border-box',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h1 style={{ fontFamily: 'Great Vibes, cursive', fontWeight: 'normal', fontSize: '72px', margin: '0', lineHeight: '1', border: 'none', outline: 'none', boxShadow: 'none', color: '#FFFF00' }}>Sunlight</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', letterSpacing: '5px', fontWeight: 'bold', textTransform: 'uppercase', border: 'none', outline: 'none', boxShadow: 'none', color: '#FFFF00' }}>Hotel, Coron</p>
            <div style={{ width: '100%', textAlign: 'right', marginTop: '30px' }}>
              <p style={{ 
                fontSize: '11px', 
                letterSpacing: '1px', 
                margin: '0',
                fontWeight: 'bold',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                color: '#FFFF00'
              }}>Warehouse Release Receipt</p>
            </div>
          </div>

          {/* Info Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '50px', border: 'none', outline: 'none', boxShadow: 'none', width: '100%' }}>
            <div style={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '900', color: '#000', letterSpacing: '0.5px', border: 'none', outline: 'none', boxShadow: 'none' }}>RELEASED TO:</p>
              <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#000', textTransform: 'uppercase', border: 'none', outline: 'none', boxShadow: 'none' }}>{receiptToExport.receiverName}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#666', fontWeight: '500', border: 'none', outline: 'none', boxShadow: 'none' }}>{receiptToExport.department}</p>
            </div>
            <div style={{ textAlign: 'right', border: 'none', outline: 'none', boxShadow: 'none' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '900', color: '#000', letterSpacing: '0.5px', border: 'none', outline: 'none', boxShadow: 'none' }}>ID:</p>
              <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#000', border: 'none', outline: 'none', boxShadow: 'none' }}>{receiptToExport.id}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#999', fontWeight: '500', border: 'none', outline: 'none', boxShadow: 'none' }}>{new Date(receiptToExport.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {/* Div-based Table for better capture */}
          <div style={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none', width: '100%' }}>
            {/* Table Header */}
            <div style={{ display: 'flex', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '5px', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
              <div style={{ flex: 1, fontSize: '12px', fontWeight: '900', color: '#000', letterSpacing: '1px' }}>ITEM</div>
              <div style={{ width: '100px', textAlign: 'right', fontSize: '12px', fontWeight: '900', color: '#000', letterSpacing: '1px' }}>QTY</div>
            </div>
            {/* Table Body */}
            {receiptToExport.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', borderBottom: '1px solid #eee', padding: '15px 0', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
                <div style={{ flex: 1, fontSize: '14px', color: '#333', fontWeight: '500' }}>{it.name}</div>
                <div style={{ width: '100px', textAlign: 'right', fontSize: '14px', fontWeight: '700', color: '#000' }}>{it.quantity} {it.uom}</div>
              </div>
            ))}
          </div>

          {/* Signature */}
          <div style={{ textAlign: 'center', width: '350px', margin: '0 auto 60px auto', border: 'none', outline: 'none', boxShadow: 'none' }}>
            <div style={{ minHeight: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '1px solid #000', paddingBottom: '10px', borderLeft: 'none', borderRight: 'none', borderTop: 'none', outline: 'none', boxShadow: 'none' }}>
              {receiptToExport.signature && <img src={receiptToExport.signature} alt="sig" crossOrigin="anonymous" style={{ maxHeight: '100px', maxWidth: '100%', border: 'none', outline: 'none', boxShadow: 'none' }} />}
            </div>
            <p style={{ fontSize: '11px', fontWeight: '700', marginTop: '15px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', outline: 'none', boxShadow: 'none' }}>Authorization Signature</p>
          </div>

          {/* Footer Marking */}
          <div style={{ marginTop: 'auto', border: 'none', outline: 'none', boxShadow: 'none' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', margin: 0, textTransform: 'uppercase', border: 'none', outline: 'none', boxShadow: 'none' }}>WH copy</p>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;