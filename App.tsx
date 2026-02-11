import { 
  InventoryItem, Transaction, User, CartItem, StockBatch, Zone 
} from './types';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  LayoutDashboard, Package, History, ShoppingCart, 
  Search, X, CheckCircle2, PackagePlus, Sparkles,
  Building, Hash, Settings, TrendingDown, 
  PlusCircle, Inbox, Users, Check, RotateCcw,
  ArrowRight, Calendar, Tag, Layers, Trash2, Edit2, ShieldCheck, Briefcase, AlertTriangle, MapPin, DollarSign, ClipboardList, Eye, Key, ChevronRight, ChevronDown, Minus, Plus, ArrowRightLeft, Globe, Download, FileJson, FileSpreadsheet, AlertCircle, Clock, Cloud, Loader2, Database, ExternalLink, RefreshCw, CalendarOff, Wand2, BrainCircuit, Activity, HardDrive, Zap, CalendarClock, PackageX, FileText
} from 'lucide-react';
import { StatCard } from './components/StatCard';
import { ItemCard } from './components/ItemCard';
import { SignaturePad } from './components/SignaturePad';
import { db } from './db';

let HOTEL_BG_URL = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=2000"; 
let BRAND_YELLOW = "#FFD700"; 
let GLOBAL_ZONE_KEY = 'All Zones';
const STORAGE_LIMIT_MB = 5120; // 5GB

const BrandLogo = ({ 
  className = "", 
  color = BRAND_YELLOW, 
  scale = "text-5xl", 
  subScale = "text-[10px]",
  subClassName = ""
}: { 
  className?: string, 
  color?: string, 
  scale?: string, 
  subScale?: string,
  subClassName?: string
}) => (
  <div className={`flex flex-col items-center select-none ${className}`}>
    <span className={`${scale} brand-script leading-[0.7]`} style={{ color }}>Sunlight</span>
    <span className={`${subScale} brand-title uppercase tracking-[0.4em] mt-2 ${subClassName}`} style={{ color: color === BRAND_YELLOW ? 'rgba(218,165,32,0.9)' : '#4b5563' }}>Hotel, Coron</span>
  </div>
);

const ReceiptContent = React.forwardRef<HTMLDivElement, { 
  lastTxId: string | null, 
  receiverName: string, 
  receiverDept: string, 
  currentUser: User | null, 
  cart: CartItem[], 
  signature: string | null 
}>(({ lastTxId, receiverName, receiverDept, currentUser, cart, signature }, ref) => {
  let date = new Date();
  let dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  let timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div ref={ref} className="w-[800px] p-12 bg-white text-gray-900 border-8 border-[#800000]/10">
      <div className="mb-10">
        <BrandLogo color={BRAND_YELLOW} scale="text-9xl" subScale="text-sm" className="items-start" subClassName="ml-24" />
      </div>
      <div className="flex justify-between items-end border-b-4 border-[#800000] pb-6 mb-10">
        <div className="space-y-1">
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Warehouse Release Receipt</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ID: {lastTxId || 'TX-089GJLT'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]">Issue Date</p>
          <p className="text-sm font-black text-[#800000] uppercase">{dateStr}</p>
          <p className="text-xs font-bold text-[#800000]">{timeStr}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-6">Recipient Information</h4>
          <p className="text-xl font-black text-[#800000] capitalize leading-none">{receiverName || 'Staff'}</p>
          <p className="text-xs font-black uppercase text-gray-400 tracking-widest mt-2">{receiverDept}</p>
        </div>
        <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-6">Releaser Information</h4>
          <p className="text-xl font-black text-[#800000] leading-none">{currentUser?.name || 'Warehouse Staff'}</p>
          <p className="text-xs font-black uppercase text-gray-400 tracking-widest mt-2">Sunlight Warehouse Team</p>
        </div>
      </div>
      <table className="w-full mb-12">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-4 text-left text-[9px] font-black uppercase text-gray-400 tracking-widest">Sku</th>
            <th className="py-4 text-left text-[9px] font-black uppercase text-gray-400 tracking-widest">Item Description</th>
            <th className="py-4 text-right text-[9px] font-black uppercase text-gray-400 tracking-widest">Quantity</th>
            <th className="py-4 text-right text-[9px] font-black uppercase text-gray-400 tracking-widest">Unit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {cart.map((item, idx) => (
            <tr key={idx}>
              <td className="py-6 text-xs font-bold text-gray-400 tabular-nums">{item.sku}</td>
              <td className="py-6 text-sm font-black text-gray-800">{item.name}</td>
              <td className="py-6 text-right text-sm font-black text-[#800000] tabular-nums">{item.quantity}</td>
              <td className="py-6 text-right text-[10px] font-black uppercase text-gray-400">{item.uom}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end pt-12">
        <div className="text-center">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-12">Electronic Acknowledgement</h4>
          {signature ? (
            <img src={signature} alt="Signature" className="h-20 mx-auto mb-2" />
          ) : (
            <div className="h-20 w-48 mx-auto border-b border-gray-200" />
          )}
        </div>
      </div>
      <div className="mt-20 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300">Sunlight Guest Hotel Coron • Warehouse Management System</p>
      </div>
    </div>
  );
});

const generateBatchId = () => `BAT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

const App: React.FC = () => {
  // --- DATABASE STATE ---
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableZones, setAvailableZones] = useState<string[]>([]);
  const [adminPassword, setAdminPassword] = useState('1234');
  
  // --- RESOURCE GUARD STATE ---
  const [storageUsageMB, setStorageUsageMB] = useState(0);

  // --- UI STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'inventory' | 'history' | 'settings'>('dashboard');
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isExitingSplash, setIsExitingSplash] = useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>(GLOBAL_ZONE_KEY);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [showAddSuccess, setShowAddSuccess] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // --- MODAL STATE ---
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isTransferringStock, setIsTransferringStock] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditingInventoryItem, setIsEditingInventoryItem] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isTursoConfigOpen, setIsTursoConfigOpen] = useState(false);
  const [showReceiveSuggestions, setShowReceiveSuggestions] = useState(false);
  const [itemHasExpiry, setItemHasExpiry] = useState(true);

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [manageTarget, setManageTarget] = useState<'users' | 'categories' | 'departments' | 'zones' | null>(null);
  const [manageInput, setManageInput] = useState('');
  const [manageRole, setManageRole] = useState<'Staff' | 'Manager'>('Staff');
  const [newPassword, setNewPassword] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverDept, setReceiverDept] = useState('Kitchen');
  const [signature, setSignature] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [currentAutoBatchId, setCurrentAutoBatchId] = useState(generateBatchId());
  const [tursoUrlInput, setTursoUrlInput] = useState('');
  const [tursoTokenInput, setTursoTokenInput] = useState('');

  // Transfer State
  const [transferData, setTransferData] = useState({ itemId: '', qty: 0, fromZone: '', toZone: '' });

  const [newItemData, setNewItemData] = useState<Partial<InventoryItem & { receivedQty: number; restockZone: string }>>({
    name: '', category: '', uom: '', unitCost: 0, parStock: 0, receivedQty: 0, restockZone: '', earliestExpiry: ''
  });

  const receiptRef = useRef<HTMLDivElement>(null);

  // --- REPORT EXPORT ENGINE ---
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const content = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportConsumptionReport = () => {
    const issues = transactions.filter(t => t.action === 'ISSUE');
    const headers = ['Timestamp', 'Item', 'SKU', 'Qty', 'UOM', 'Department', 'Recipient', 'Issued By'];
    const rows = issues.map(t => [
      new Date(t.timestamp).toLocaleString(),
      t.itemName,
      t.itemSku,
      t.qty.toString(),
      t.itemUom || '',
      t.department || '',
      t.receiverName || '',
      t.user
    ]);
    downloadCSV(`Sunlight_Consumption_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    notify("Consumption Exported");
  };

  const exportParReport = () => {
    const headers = ['SKU', 'Item', 'Category', 'Current Stock', 'PAR Level', 'Gap', 'UOM', 'Status'];
    const rows = inventory.map(item => {
      const totalStock = item.batches.reduce((sum, b) => sum + b.quantity, 0);
      const gap = Math.max(0, item.parStock - totalStock);
      return [
        item.sku,
        item.name,
        item.category,
        totalStock.toString(),
        item.parStock.toString(),
        gap.toString(),
        item.uom,
        totalStock <= item.parStock * 0.4 ? 'LOW' : 'OK'
      ];
    });
    downloadCSV(`Sunlight_PAR_Audit_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    notify("PAR Audit Exported");
  };

  const exportExpiryReport = () => {
    const headers = ['Item', 'SKU', 'Batch ID', 'Zone', 'Qty', 'Expiry Date', 'Days Remaining'];
    const rows: string[][] = [];
    
    inventory.forEach(item => {
      item.batches.forEach(batch => {
        if (batch.quantity <= 0) return;
        const diffDays = Math.ceil((new Date(batch.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        rows.push([
          item.name,
          item.sku,
          batch.id,
          batch.zone,
          batch.quantity.toString(),
          batch.expiry === '2099-12-31' ? 'Perpetual' : batch.expiry,
          batch.expiry === '2099-12-31' ? 'N/A' : diffDays.toString()
        ]);
      });
    });

    rows.sort((a, b) => {
      if (a[5] === 'Perpetual') return 1;
      if (b[5] === 'Perpetual') return -1;
      return new Date(a[5]).getTime() - new Date(b[5]).getTime();
    });

    downloadCSV(`Sunlight_Expiry_Report_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    notify("Expiry Report Exported");
  };

  // --- RESOURCE TICKER ---
  useEffect(() => {
    const tick = async () => {
      await db.trackActiveSession();
      const usage = await db.getStorageUsageMB();
      setStorageUsageMB(usage);
    };
    tick();
    const interval = setInterval(tick, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  // --- DATA FETCHING ---
  const loadAppData = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoadingData(true);
      await db.initialize();
      const [inv, txs, u, cfg, pw, cloud] = await Promise.all([
        db.getInventory(),
        db.getTransactions(),
        db.getUsers(),
        db.getConfig(),
        db.getAdminPassword(),
        db.isCloud()
      ]);
      
      const seededInv = inv.map(item => ({
        ...item,
        initialParStock: item.initialParStock || item.parStock
      }));

      setInventory(seededInv || []);
      setTransactions(txs || []);
      setUsers(u || []);
      setAvailableCategories(cfg.categories || []);
      setAvailableDepartments(cfg.departments || []);
      setAvailableZones(cfg.zones || []);
      setAdminPassword(pw || '1234');
      setIsCloudMode(cloud);
      if (!currentUser && u) setCurrentUser(u[0]);
      if (showLoader) setIsLoadingData(false);
    } catch (err) {
      console.error("Failed to load sunlight data", err);
      if (showLoader) setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadAppData();
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await db.reconcile();
      await loadAppData(false);
      notify("Data Synchronized");
    } catch (e) {
      console.error("Sync failed", e);
      notify("Sync Failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePruneLogs = async () => {
    if (confirm("Permanently delete transaction logs older than 90 days?")) {
      setIsSyncing(true);
      const count = await db.pruneOldLogs();
      await loadAppData(false);
      setIsSyncing(false);
      notify(`Reclaimed space: ${count} logs removed`);
    }
  };

  const calibrateParStocks = async () => {
    setIsSyncing(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const updatedInventory = inventory.map(item => {
      const itemIssues = transactions.filter(t => 
        t.itemSku === item.sku && 
        t.action === 'ISSUE' && 
        new Date(t.timestamp) >= thirtyDaysAgo
      );

      const totalIssued = itemIssues.reduce((sum, t) => sum + t.qty, 0);
      const averageDailyUsage = totalIssued / 30;
      const recommendedPar = Math.ceil(averageDailyUsage * 14);
      const finalPar = Math.max(item.initialParStock, recommendedPar, 1);
      return { ...item, parStock: finalPar };
    });

    await db.updateInventory(updatedInventory);
    setInventory(updatedInventory);
    setIsSyncing(false);
    notify("PAR Levels Calibrated");
  };

  const syncAggregates = (item: InventoryItem): InventoryItem => {
    let stock: Record<string, number> = {};
    availableZones.forEach(z => stock[z] = 0);
    let earliest = '9999-12-31';
    item.batches.forEach(b => {
      if (b.quantity > 0) {
        let zone = b.zone || availableZones[0];
        if (!stock[zone]) stock[zone] = 0;
        stock[zone] += b.quantity;
        if (b.expiry && b.expiry < earliest) earliest = b.expiry;
      }
    });
    return { ...item, stock, earliestExpiry: earliest === '9999-12-31' ? (item.earliestExpiry || 'N/A') : earliest };
  };

  const notify = (msg: string) => {
    setShowAddSuccess(msg);
    setTimeout(() => setShowAddSuccess(null), 2000);
  };

  const handleEnterApp = () => {
    setIsExitingSplash(true);
    setTimeout(() => setIsSplashVisible(false), 800);
  };

  const handleOpenReceive = () => {
    setNewItemData({
      name: '',
      category: availableCategories[0] || '',
      uom: '',
      unitCost: 0,
      parStock: 0,
      receivedQty: 0,
      restockZone: availableZones[0] || '',
      earliestExpiry: ''
    });
    setCurrentAutoBatchId(generateBatchId());
    setIsAddingItem(true);
    setShowReceiveSuggestions(false);
    setItemHasExpiry(true);
  };

  const handleFinalIssue = async () => {
    if (!signature || !receiverName) return;
    setIsSyncing(true);
    let newTxId = `TX-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    setLastTxId(newTxId);

    let updatedInventory = [...inventory];
    let newTransactions: Transaction[] = [];

    cart.forEach(cartItem => {
      let invIndex = updatedInventory.findIndex(i => i.id === cartItem.itemId);
      if (invIndex === -1) return;
      let item = { ...updatedInventory[invIndex] };
      let remainingToDeduct = cartItem.quantity;
      let itemBatchesInZone = item.batches
        .filter(b => b.zone === cartItem.zone && b.quantity > 0)
        .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());

      for (let batch of itemBatchesInZone) {
        if (remainingToDeduct <= 0) break;
        let originalBatchIndex = item.batches.findIndex(b => b.id === batch.id && b.zone === cartItem.zone);
        let deduct = Math.min(batch.quantity, remainingToDeduct);
        item.batches[originalBatchIndex] = { ...item.batches[originalBatchIndex], quantity: item.batches[originalBatchIndex].quantity - deduct };
        remainingToDeduct -= deduct;
      }
      updatedInventory[invIndex] = syncAggregates(item);
      newTransactions.push({
        id: `${newTxId}-${cartItem.sku}`,
        timestamp: new Date().toISOString(),
        user: currentUser?.name || 'Unknown',
        action: 'ISSUE',
        qty: cartItem.quantity,
        itemSku: cartItem.sku,
        itemName: cartItem.name,
        itemUom: cartItem.uom,
        destZone: cartItem.zone,
        department: receiverDept,
        receiverName: receiverName,
        signature: signature || undefined
      });
    });

    await db.updateInventory(updatedInventory);
    await db.addTransactions(newTransactions);
    
    setInventory(updatedInventory);
    setTransactions(prev => [...newTransactions, ...prev]);

    if (receiptRef.current) {
      let canvas = await html2canvas(receiptRef.current!, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      let link = document.createElement('a');
      link.download = `Sunlight_Release_${newTxId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    
    setCart([]);
    setSignature(null);
    setReceiverName('');
    setIsCheckingOut(false);
    setIsCartOpen(false);
    setIsSyncing(false);
    notify(`Issue Complete: ${newTxId}`);
  };

  const handleCommitStockEntry = async () => {
    if (!newItemData.name || !newItemData.uom) return alert("Name and UOM are required");
    setIsSyncing(true);
    let qty = newItemData.receivedQty || 0;
    let expiry = (itemHasExpiry && newItemData.earliestExpiry) ? newItemData.earliestExpiry : '2099-12-31';

    let initialBatch: StockBatch = {
      id: currentAutoBatchId,
      expiry: expiry,
      quantity: qty,
      zone: newItemData.restockZone || availableZones[0]
    };

    let updatedInventory = [...inventory];
    let existingIndex = inventory.findIndex(i => i.name.toLowerCase() === newItemData.name?.toLowerCase());
    
    if (existingIndex > -1) {
      let existingItem = { ...updatedInventory[existingIndex] };
      updatedInventory[existingIndex] = syncAggregates({
        ...existingItem,
        batches: [...existingItem.batches, initialBatch],
        unitCost: newItemData.unitCost || existingItem.unitCost,
        parStock: newItemData.parStock || existingItem.parStock,
        uom: newItemData.uom || existingItem.uom,
        category: newItemData.category || existingItem.category
      });
    } else {
      let item: InventoryItem = syncAggregates({
        id: Math.random().toString(36).substr(2, 9),
        sku: `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        name: newItemData.name!,
        category: newItemData.category || availableCategories[0],
        uom: newItemData.uom!,
        stock: {}, 
        batches: [initialBatch],
        earliestExpiry: initialBatch.expiry,
        unitCost: newItemData.unitCost || 0,
        parStock: newItemData.parStock || 0,
        initialParStock: newItemData.parStock || 0, 
        isFastMoving: false
      });
      updatedInventory = [item, ...updatedInventory];
    }

    await db.updateInventory(updatedInventory);
    setInventory(updatedInventory);
    setIsAddingItem(false);
    setIsSyncing(false);
    notify(`Stock Received: ${currentAutoBatchId}`);
  };

  const handleSaveEditItem = async () => {
    if (!itemToEdit) return;
    setIsSyncing(true);
    const updatedInventory = inventory.map(i => i.id === itemToEdit.id ? syncAggregates({ ...itemToEdit, initialParStock: itemToEdit.parStock }) : i);
    await db.updateInventory(updatedInventory);
    setInventory(updatedInventory);
    setIsEditingInventoryItem(false);
    setIsSyncing(false);
    notify("Item Updated");
  };

  const handleDeleteInventoryItem = async () => {
    if (!itemToEdit) return;
    const itemId = itemToEdit.id;
    const itemName = itemToEdit.name;

    if (window.confirm(`Permanently delete "${itemName}"? This will erase all history and stock records for this item.`)) {
      try {
        setIsSyncing(true);
        // 1. Capture inventory before filtering
        const currentInv = await db.getInventory();
        const nextInv = currentInv.filter(i => i.id !== itemId);
        
        // 2. Persist to database
        await db.updateInventory(nextInv);
        
        // 3. Update application state
        setInventory(nextInv);
        
        // 4. UI Cleanup
        setIsEditingInventoryItem(false);
        setItemToEdit(null);
        notify("Item Removed");
      } catch (err) {
        console.error("Deletion failed", err);
        alert("Failed to delete item. Please retry.");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleTransferStock = async () => {
    if (!transferData.itemId || !transferData.toZone || transferData.qty <= 0) return alert("Incomplete data");
    setIsSyncing(true);
    
    const updatedInventory = inventory.map(item => {
      if (item.id !== transferData.itemId) return item;
      let remaining = transferData.qty;
      let newBatches = item.batches.map(batch => {
        if (batch.zone === transferData.fromZone && remaining > 0 && batch.quantity > 0) {
          let deduct = Math.min(batch.quantity, remaining);
          remaining -= deduct;
          return { ...batch, quantity: batch.quantity - deduct };
        }
        return batch;
      });
      
      newBatches.push({
        id: `TR-${generateBatchId()}`,
        expiry: '2099-12-31', 
        quantity: transferData.qty,
        zone: transferData.toZone
      });

      return syncAggregates({ ...item, batches: newBatches });
    });

    await db.updateInventory(updatedInventory);
    setInventory(updatedInventory);
    
    await db.addTransactions([{
      id: `TX-TR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Manager',
      action: 'TRANSFER' as any,
      qty: transferData.qty,
      itemSku: inventory.find(i=>i.id===transferData.itemId)?.sku || '',
      itemName: inventory.find(i=>i.id===transferData.itemId)?.name || '',
      sourceZone: transferData.fromZone,
      destZone: transferData.toZone
    }]);

    setIsTransferringStock(false);
    setIsSyncing(false);
    notify("Transfer Complete");
  };

  const addToCart = (item: InventoryItem, qty: number) => {
    if (selectedZone === GLOBAL_ZONE_KEY) return alert("Select a specific zone to issue from.");
    setCart(prev => {
      let existing = prev.find(i => i.itemId === item.id && i.zone === selectedZone);
      if (existing) return prev.map(i => i.itemId === item.id && i.zone === selectedZone ? {...i, quantity: i.quantity + qty} : i);
      return [...prev, { itemId: item.id, sku: item.sku, name: item.name, quantity: qty, zone: selectedZone, uom: item.uom }];
    });
    notify("Added to Cart");
  };

  const removeFromCart = (itemId: string, zone: string) => {
    setCart(prev => prev.filter(i => !(i.itemId === itemId && i.zone === zone)));
  };

  const selectUserRequest = (user: User) => {
    if (user.role === 'Manager') {
      setPendingUser(user);
      setIsPasswordPromptOpen(true);
    } else {
      setCurrentUser(user);
      setIsUserSelectorOpen(false);
    }
  };

  const handleVerifyPassword = async () => {
    let stored = await db.getAdminPassword();
    if (passwordInput === stored) {
      if (pendingUser) setCurrentUser(pendingUser);
      setIsPasswordPromptOpen(false);
      setIsUserSelectorOpen(false);
      setPendingUser(null);
      passwordError && setPasswordError(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 1000);
    }
  };

  const handleManageSubmit = async () => {
    if (!manageInput) return;
    setIsSyncing(true);
    if (manageTarget === 'users') {
      let newUser: User = { id: Date.now().toString(), name: manageInput, role: manageRole };
      let updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      await db.saveUsers(updatedUsers);
    } else {
      let updatedConfig = await db.getConfig();
      if (manageTarget === 'categories') updatedConfig.categories.push(manageInput);
      else if (manageTarget === 'zones') updatedConfig.zones.push(manageInput);
      else if (manageTarget === 'departments') updatedConfig.departments.push(manageInput);
      setAvailableCategories([...updatedConfig.categories]);
      setAvailableZones([...updatedConfig.zones]);
      setAvailableDepartments([...updatedConfig.departments]);
      await db.saveConfig(updatedConfig);
    }
    setManageInput('');
    setIsSyncing(false);
    notify("Added Successfully");
  };

  const handleManageDelete = async (item: any) => {
    setIsSyncing(true);
    if (manageTarget === 'users') {
      if (users.length <= 1) return alert("Must have at least one user");
      let updated = users.filter(u => u.id !== item.id);
      setUsers(updated);
      await db.saveUsers(updated);
    } else {
      let updatedConfig = await db.getConfig();
      if (manageTarget === 'categories') updatedConfig.categories = updatedConfig.categories.filter(x => x !== item);
      else if (manageTarget === 'zones') updatedConfig.zones = updatedConfig.zones.filter(x => x !== item);
      else if (manageTarget === 'departments') updatedConfig.departments = updatedConfig.departments.filter(x => x !== item);
      setAvailableCategories([...updatedConfig.categories]);
      setAvailableZones([...updatedConfig.zones]);
      setAvailableDepartments([...updatedConfig.departments]);
      await db.saveConfig(updatedConfig);
    }
    setIsSyncing(false);
    notify("Deleted Successfully");
  };

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 4) return alert("Security key must be at least 4 chars");
    await db.setAdminPassword(newPassword);
    setAdminPassword(newPassword);
    setNewPassword('');
    setIsPasswordChangeOpen(false);
    notify("Key Updated");
  };

  const handleConnectTurso = async () => {
    const cleanUrl = tursoUrlInput.trim();
    if (!cleanUrl) return alert("Enter a valid Turso database URL");
    setIsSyncing(true);
    try {
      await db.syncLocalToCloud(cleanUrl, tursoTokenInput.trim() || null);
      await loadAppData();
      setIsTursoConfigOpen(false);
      notify("Turso Cloud Synced");
    } catch (e) {
      console.error(e);
      alert("Failed to connect to Turso. Check your credentials.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectTurso = async () => {
    if (confirm("Switch back to Local mode? Cloud data will remain on Turso but app will use LocalStorage.")) {
      await db.setTursoConfig(null, null);
      await loadAppData();
      setIsTursoConfigOpen(false);
      notify("Switched to Local Mode");
    }
  };

  const handleOpenTursoConfig = () => {
    const cfg = db.getCloudConfig();
    setTursoUrlInput(cfg.url);
    setTursoTokenInput(cfg.token);
    setIsTursoConfigOpen(true);
  };

  const filteredItems = useMemo(() => {
    return inventory.filter(i => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = i.name.toLowerCase().includes(searchLower) || i.sku.toLowerCase().includes(searchLower);
      const matchesZone = selectedZone === GLOBAL_ZONE_KEY || (i.stock[selectedZone] > 0);
      return matchesSearch && matchesZone;
    });
  }, [inventory, searchTerm, selectedZone]);

  const stockValue = useMemo(() => inventory.reduce((total, item) => total + (item.batches.reduce((s,b)=>s+b.quantity,0) * (item.unitCost || 0)), 0), [inventory]);
  const belowParItems = useMemo(() => inventory.filter(i => {
    const totalStock = i.batches.reduce((s, b) => s + b.quantity, 0);
    return totalStock <= i.parStock * 0.4;
  }), [inventory]);
  const expiringSoonItems = useMemo(() => inventory.filter(i => {
    let diff = Math.ceil((new Date(i.earliestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff <= 90 && diff > 0;
  }), [inventory]);
  
  const expiredItems = useMemo(() => inventory.filter(i => {
    if (i.earliestExpiry === '2099-12-31') return false;
    let diff = Math.ceil((new Date(i.earliestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff <= 0;
  }), [inventory]);

  const receiveSuggestions = useMemo(() => {
    if (!newItemData.name || newItemData.name.length < 1) return [];
    return inventory.filter(i => i.name.toLowerCase().includes(newItemData.name!.toLowerCase())).slice(0, 5);
  }, [inventory, newItemData.name]);

  let modalInputClass = "w-full p-4 border border-gray-100 rounded-2xl text-sm font-bold bg-gray-50 focus:border-[#800000] focus:bg-white outline-none transition-all placeholder:text-gray-300";
  let labelClass = "text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block";

  if (isLoadingData) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#800000] text-white">
        <Loader2 className="w-12 h-12 animate-spin text-[#FFD700] mb-4" />
        <BrandLogo scale="text-6xl" />
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] opacity-40 animate-pulse">Synchronizing with Turso Edge...</p>
      </div>
    );
  }

  if (isSplashVisible) {
    return (
      <div className={`h-full flex items-center justify-center p-4 bg-cover bg-center relative transition-all duration-700 ${isExitingSplash ? 'scale-110 opacity-0 blur-lg' : ''}`} style={{ backgroundImage: `url(${HOTEL_BG_URL})` }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="bg-[#800000]/30 backdrop-blur-md p-10 rounded-[4rem] shadow-2xl w-full max-sm text-center border border-white/20 relative z-10 animate-in fade-in flex flex-col items-center">
          <BrandLogo className="scale-[1.8] drop-shadow-xl mb-4" />
          <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] opacity-90 mb-12">Warehouse Management</p>
          <button onClick={handleEnterApp} className="w-[80%] py-3 border border-[#FFD700]/30 text-[#FFD700] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-[#FFD700]/5 flex items-center justify-center gap-2 group">
            Enter Dashboard <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900 overflow-hidden pt-safe">
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        <ReceiptContent ref={receiptRef} lastTxId={lastTxId} receiverName={receiverName} receiverDept={receiverDept} currentUser={currentUser} cart={cart} signature={signature} />
      </div>

      {showAddSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl font-black text-[10px] flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-green-400" /> <span className="uppercase tracking-widest">{showAddSuccess}</span>
        </div>
      )}

      <header className="bg-[#800000] text-white px-6 shadow-lg flex justify-between items-center h-16 shrink-0 z-50">
        <BrandLogo className="scale-75 -ml-4" />
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-1">
             <div className="flex items-center gap-1.5 mb-0.5">
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-spin' : isCloudMode ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-green-400'}`} />
               <span className={`text-[6px] font-black uppercase tracking-[0.15em] ${isSyncing ? 'text-amber-300' : isCloudMode ? 'text-blue-300' : 'text-green-300/80'}`}>{isSyncing ? 'Syncing...' : isCloudMode ? 'Turso Connected' : 'Local Active'}</span>
             </div>
             <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[80px]">{currentUser?.name}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleManualSync} 
              disabled={isSyncing}
              title="Manual Sync"
              className={`bg-white/10 p-2.5 rounded-xl hover:bg-white/20 active:scale-90 transition-all ${isSyncing ? 'opacity-50' : ''}`}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsUserSelectorOpen(true)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 active:scale-90 transition-all">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      {(view === 'inventory' || view === 'history') && (
        <div className="bg-white border-b shadow-sm z-40 px-4 py-2 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="Search by name or SKU..." value={view === 'inventory' ? searchTerm : historySearch} onChange={e => view === 'inventory' ? setSearchTerm(e.target.value) : setHistorySearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-bold outline-none focus:border-[#800000] bg-gray-50" />
          </div>
          <div className="relative flex items-center">
            <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="text-[10px] font-black border rounded-xl pl-8 pr-3 py-2 bg-gray-50 outline-none appearance-none cursor-pointer">
              <option value={GLOBAL_ZONE_KEY}>All Zones</option>
              {availableZones.map(z => <option key={z} value={z}>{z.split(' (')[0]}</option>)}
            </select>
            <div className="absolute left-2.5 text-gray-400">{selectedZone === GLOBAL_ZONE_KEY ? <Globe size={14} /> : <MapPin size={14} />}</div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-24">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Stock Value" value={`₱${(stockValue/1000).toFixed(1)}K`} icon={<Sparkles size={12}/>} />
              <StatCard label="Below PAR" value={belowParItems.length} icon={<TrendingDown size={12}/>} />
              <StatCard label="Expiring" value={expiringSoonItems.length} icon={<Clock size={12}/>} />
              <StatCard label="Zones" value={availableZones.length} icon={<Building size={12}/>} />
            </div>

            {(expiredItems.length > 0 || belowParItems.length > 0 || expiringSoonItems.length > 0) && (
              <section className="animate-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between px-1 mb-3">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Operational Alerts</h4>
                   <span className="text-[8px] font-black text-[#800000] uppercase bg-[#800000]/5 px-2 py-0.5 rounded-full">Requires Attention</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {expiredItems.slice(0, 3).map(item => (
                    <div key={`alert-exp-${item.id}`} className="bg-white border-2 border-red-100 rounded-3xl p-4 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-all">
                      <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                        <CalendarClock size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Expired Item</span>
                        </div>
                        <h5 className="text-sm font-black text-gray-900 truncate">{item.name}</h5>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Expired on {item.earliestExpiry}</p>
                      </div>
                      <button 
                        onClick={() => { setSearchTerm(item.sku); setView('inventory'); }}
                        className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-[#800000] hover:bg-[#800000]/5 transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ))}

                  {belowParItems.slice(0, 3).map(item => {
                    const total = item.batches.reduce((s,b)=>s+b.quantity,0);
                    return (
                      <div key={`alert-par-${item.id}`} className="bg-white border-2 border-amber-100 rounded-3xl p-4 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                          <PackageX size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Restock Required</span>
                          </div>
                          <h5 className="text-sm font-black text-gray-900 truncate">{item.name}</h5>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Available: {total} / PAR: {item.parStock} {item.uom}</p>
                        </div>
                        <button 
                          onClick={() => { setSearchTerm(item.sku); setView('inventory'); }}
                          className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-[#800000] hover:bg-[#800000]/5 transition-all"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Quick Actions</h4>
              <div className="grid grid-cols-4 gap-4">
                <button onClick={() => setView('inventory')} className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Package size={20}/></div>
                  <span className="text-[8px] font-black uppercase">Stock</span>
                </button>
                <button onClick={handleOpenReceive} className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-green-50 text-green-600 rounded-full"><PlusCircle size={20}/></div>
                  <span className="text-[8px] font-black uppercase">Add</span>
                </button>
                <button onClick={() => setIsTransferringStock(true)} className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><ArrowRightLeft size={20}/></div>
                  <span className="text-[8px] font-black uppercase">Move</span>
                </button>
                <button onClick={() => setView('history')} className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><History size={20}/></div>
                  <span className="text-[8px] font-black uppercase">Logs</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                selectedZone={selectedZone as any} 
                onIssue={addToCart} 
                onEdit={(i) => { setItemToEdit(i); setIsEditingInventoryItem(true); }} 
              />
            ))}
          </div>
        )}

        {view === 'history' && (
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-[11px]">
               <thead className="bg-gray-50 border-b font-black uppercase text-gray-400">
                 <tr>
                   <th className="px-4 py-3">Date</th>
                   <th className="px-4 py-3">Item</th>
                   <th className="px-4 py-3">Dept</th>
                   <th className="px-4 py-3 text-right">Qty</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {transactions.filter(t => t.itemName.toLowerCase().includes(historySearch.toLowerCase())).map(t => (
                   <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                     <td className="px-4 py-3 font-black text-gray-400">{new Date(t.timestamp).toLocaleDateString([], {month:'short', day:'numeric'})}</td>
                     <td className="px-4 py-3 font-bold truncate max-w-[120px]">{t.itemName}</td>
                     <td className="px-4 py-3 text-[9px] font-black uppercase text-gray-300">{t.department || 'WH'}</td>
                     <td className="px-4 py-3 text-right font-black text-[#800000] tabular-nums">{t.qty}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6 pb-12">
            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                <Activity size={12} className="text-[#800000]" /> Server Guard Monitoring
              </h4>
              <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-2">
                      <HardDrive size={14} className="text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Storage Footprint</span>
                    </div>
                    <span className="text-xs font-black tabular-nums">{storageUsageMB.toFixed(2)} MB / {STORAGE_LIMIT_MB} MB</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${storageUsageMB > (STORAGE_LIMIT_MB * 0.8) ? 'bg-red-500' : 'bg-[#800000]'}`} style={{ width: `${Math.min(100, (storageUsageMB / STORAGE_LIMIT_MB) * 100)}%` }} />
                  </div>
                </div>

                <div className="pt-4 border-t grid grid-cols-1 gap-3">
                   <button 
                     onClick={handlePruneLogs}
                     className="w-full p-4 bg-gray-50 border rounded-2xl flex items-center justify-between hover:bg-gray-100 transition-colors"
                   >
                     <div className="flex items-center gap-3">
                       <Trash2 size={16} className="text-red-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Reclaim Storage (Purge Logs)</span>
                     </div>
                     <ChevronRight size={14} className="text-gray-300" />
                   </button>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                <FileText size={12} className="text-[#800000]" /> Reports & Data Export
              </h4>
              <div className="bg-white border rounded-3xl overflow-hidden shadow-sm divide-y">
                <button onClick={exportConsumptionReport} className="w-full p-5 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileSpreadsheet size={22} /></div>
                    <div className="text-left">
                       <span className="text-base font-black block">Consumption Summary</span>
                       <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Excel compatible .CSV issue log</span>
                    </div>
                  </div>
                  <Download size={20} className="text-gray-200" />
                </button>
                <button onClick={exportParReport} className="w-full p-5 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><ClipboardList size={22} /></div>
                    <div className="text-left">
                       <span className="text-base font-black block">PAR Stock Audit</span>
                       <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Full stock inventory vs baseline PAR</span>
                    </div>
                  </div>
                  <Download size={20} className="text-gray-200" />
                </button>
                <button onClick={exportExpiryReport} className="w-full p-5 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><CalendarClock size={22} /></div>
                    <div className="text-left">
                       <span className="text-base font-black block">Expiration Audit</span>
                       <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Detailed breakdown of batch life-cycles</span>
                    </div>
                  </div>
                  <Download size={20} className="text-gray-200" />
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                <BrainCircuit size={12} className="text-[#800000]" /> Intelligence & Optimization
              </h4>
              <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
                <button 
                  onClick={calibrateParStocks} 
                  disabled={isSyncing}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                      <Wand2 size={22} className={isSyncing ? 'animate-pulse' : ''} />
                    </div>
                    <div className="text-left">
                       <span className="text-base font-black block">Calibrate PAR Stock</span>
                       <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Recalculate based on 30-day consumption</span>
                    </div>
                  </div>
                  {isSyncing ? <Loader2 size={16} className="animate-spin text-gray-200" /> : <ChevronRight size={20} className="text-gray-200" />}
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cloud Integration</h4>
              <div className="bg-white border rounded-3xl overflow-hidden shadow-sm divide-y">
                <button onClick={handleOpenTursoConfig} className="w-full p-5 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Database size={22} /></div>
                    <div className="text-left">
                       <span className="text-base font-black block">Turso SQLite DB</span>
                       <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">{isCloudMode ? 'Active Edge Connection' : 'Local-only Storage'}</span>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-gray-200" />
                </button>
                {isCloudMode && (
                  <button onClick={handleManualSync} disabled={isSyncing} className="w-full p-5 flex items-center justify-between hover:bg-gray-50 group">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><RefreshCw size={22} className={isSyncing ? 'animate-spin' : ''} /></div>
                      <div className="text-left">
                         <span className="text-base font-black block">Force Reconciliation</span>
                         <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Compare & Sync Latest Records</span>
                      </div>
                    </div>
                    {isSyncing ? <Loader2 size={20} className="animate-spin text-gray-300" /> : <ChevronRight size={20} className="text-gray-200" />}
                  </button>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Management</h4>
              <div className="space-y-3">
                {[
                  { id: 'users', label: 'Manage Users', icon: Users, count: users.length },
                  { id: 'zones', label: 'Manage Zones', icon: MapPin, count: availableZones.length },
                  { id: 'categories', label: 'Manage Categories', icon: Tag, count: availableCategories.length },
                  { id: 'departments', label: 'Manage Departments', icon: Briefcase, count: availableDepartments.length }
                ].map(item => (
                  <button key={item.id} onClick={() => { setManageTarget(item.id as any); setIsManageModalOpen(true); }} className="w-full bg-white border p-5 rounded-3xl flex items-center justify-between shadow-sm hover:border-[#800000] transition-all">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-gray-50 text-[#800000] rounded-2xl"><item.icon size={22} /></div>
                      <span className="text-base font-black">{item.label}</span>
                    </div>
                    <span className="bg-gray-100 text-[10px] font-black px-2.5 py-1 rounded-full text-gray-400">{item.count}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-around h-20 pb-safe z-50">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
          { id: 'inventory', icon: Package, label: 'Stock' },
          { id: 'history', icon: History, label: 'Logs' },
          { id: 'settings', icon: Settings, label: 'Setup' }
        ].map(item => (
          <button key={item.id} onClick={() => setView(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all ${view === item.id ? 'text-[#800000]' : 'text-gray-300'}`}>
            <item.icon size={22} className={view === item.id ? 'stroke-[2.5px]' : ''} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        <button onClick={() => setIsCartOpen(true)} className={`relative flex flex-col items-center gap-1.5 transition-all ${cart.length > 0 ? 'text-[#800000]' : 'text-gray-300'}`}>
          <div className="relative">
            <ShoppingCart size={22} />
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#800000] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce">{cart.length}</span>}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Cart</span>
        </button>
      </footer>

      <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
        <div className={`px-2 py-1 rounded-full text-[6px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-sm backdrop-blur-md ${storageUsageMB > (STORAGE_LIMIT_MB * 0.8) ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white/80 text-gray-400 border-gray-100'}`}>
          <HardDrive size={8} /> {storageUsageMB.toFixed(1)}MB Footprint
        </div>
      </div>

      {isTursoConfigOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
             <div className="p-8 border-b bg-blue-50/50 flex justify-between items-center">
               <div className="flex items-center gap-3 text-blue-600">
                 <Database size={24} />
                 <div>
                   <h3 className="text-sm font-black uppercase tracking-widest">Turso Cloud Setup</h3>
                   <p className="text-[9px] font-bold uppercase opacity-60">Edge SQLite Integration</p>
                 </div>
               </div>
               <button onClick={() => setIsTursoConfigOpen(false)} className="p-2 hover:bg-blue-100 rounded-xl transition-colors"><X size={20}/></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                   <Cloud className="text-blue-500 shrink-0" size={24} />
                   <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase">The system is currently using the Sunlight Guest Hotel Coron production database. You can modify the URL or Token if you wish to use a custom instance.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Database URL</label>
                    <input 
                      type="text" 
                      placeholder="libsql://your-db-name.turso.io" 
                      value={tursoUrlInput} 
                      onChange={e => setTursoUrlInput(e.target.value)}
                      className={modalInputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Auth Token</label>
                    <input 
                      type="password" 
                      placeholder="Enter your Turso JWT" 
                      value={tursoTokenInput} 
                      onChange={e => setTursoTokenInput(e.target.value)}
                      className={modalInputClass}
                    />
                  </div>
                  <a href="https://turso.tech" target="_blank" className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase tracking-widest mt-2 hover:underline">
                    Get credentials from Turso CLI/Dashboard <ExternalLink size={10} />
                  </a>
                </div>

                {isCloudMode && (
                  <div className="pt-4 border-t">
                    <button onClick={handleDisconnectTurso} className="w-full py-3 border border-red-100 text-red-500 rounded-2xl text-[10px] font-black uppercase hover:bg-red-50 transition-colors">
                      Disconnect Cloud Storage
                    </button>
                  </div>
                )}
             </div>
             <div className="p-8 bg-gray-50 border-t flex gap-4">
                <button onClick={() => setIsTursoConfigOpen(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase">Back</button>
                <button 
                  onClick={handleConnectTurso} 
                  disabled={!tursoUrlInput || isSyncing}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Connect & Sync
                </button>
             </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-[#800000] text-white">
              <div>
                <h3 className="text-base font-black uppercase tracking-widest">Issue Request</h3>
                <p className="text-[9px] font-bold text-white/60 uppercase">{cart.length} Items Selected</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {cart.map((item, idx) => (
                <div key={`${item.itemId}-${item.zone}`} className="bg-gray-50 border p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tabular-nums">{item.sku}</p>
                    <p className="font-black text-sm text-gray-800">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="bg-[#800000]/5 text-[#800000] text-[8px] font-black px-1.5 py-0.5 rounded uppercase">{item.zone.split(' ')[0]}</span>
                       <span className="text-[9px] font-bold text-gray-400">Qty: {item.quantity} {item.uom}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.itemId, item.zone)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-50">
                  <ShoppingCart size={48} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Cart is Empty</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t space-y-4">
              <button 
                disabled={cart.length === 0}
                onClick={() => setIsCheckingOut(true)}
                className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
              >
                Sign Off & Release
              </button>
            </div>
          </div>
        </div>
      )}

      {isTransferringStock && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
             <div className="p-8 border-b flex justify-between items-center bg-amber-50/50">
               <div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-amber-600">Stock Transfer</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase">Movement Between Zones</p>
               </div>
               <button onClick={() => setIsTransferringStock(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                <div className="space-y-1.5">
                  <label className={labelClass}>Select Item</label>
                  <select 
                    value={transferData.itemId} 
                    onChange={e => {
                      const item = inventory.find(i=>i.id===e.target.value);
                      setTransferData({
                        ...transferData, 
                        itemId: e.target.value,
                        fromZone: item ? Object.keys(item.stock).find(z => item.stock[z] > 0) || availableZones[0] : availableZones[0]
                      });
                    }} 
                    className={modalInputClass}
                  >
                    <option value="">Select an Item...</option>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                  </select>
                </div>
                {transferData.itemId && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={labelClass}>From Zone</label>
                        <select 
                          value={transferData.fromZone} 
                          onChange={e => setTransferData({...transferData, fromZone: e.target.value})} 
                          className={modalInputClass} 
                        >
                          {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>To Zone</label>
                        <select 
                          value={transferData.toZone} 
                          onChange={e => setTransferData({...transferData, toZone: e.target.value})} 
                          className={modalInputClass} 
                        >
                          {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Transfer Quantity</label>
                      <input 
                        type="number" 
                        value={transferData.qty} 
                        onChange={e => setTransferData({...transferData, qty: parseFloat(e.target.value) || 0})} 
                        className={modalInputClass} 
                      />
                    </div>
                  </>
                )}
             </div>
             <div className="p-8 border-t flex gap-4">
                <button onClick={() => setIsTransferringStock(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400">Cancel</button>
                <button onClick={handleTransferStock} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Move Stock</button>
             </div>
          </div>
        </div>
      )}

      {/* High Fidelity Edit Item Modal (Screenshot Match) */}
      {isEditingInventoryItem && itemToEdit && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
             {/* Header */}
             <div className="px-8 pt-8 pb-4 flex justify-between items-start">
               <div className="space-y-1">
                 <h3 className="text-xl font-black uppercase tracking-tight text-[#800000]">EDIT ITEM</h3>
                 <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{itemToEdit.sku}</p>
               </div>
               <div className="flex gap-2 items-center">
                 <button 
                   onClick={() => handleDeleteInventoryItem()}
                   className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
                   title="Delete Item"
                 >
                   <Trash2 size={26} strokeWidth={2.5} />
                 </button>
                 <button 
                  onClick={() => setIsEditingInventoryItem(false)} 
                  className="p-3 text-gray-300 hover:bg-gray-100 rounded-full transition-all"
                 >
                   <X size={30} strokeWidth={2.5} />
                 </button>
               </div>
             </div>
             
             {/* Body */}
             <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-7 no-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">NAME</label>
                  <input 
                    type="text" 
                    value={itemToEdit.name} 
                    onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} 
                    className="w-full p-5 border-none rounded-[1.8rem] text-base font-bold bg-gray-50/80 focus:bg-white focus:ring-4 focus:ring-[#800000]/5 outline-none transition-all shadow-inner"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">CATEGORY</label>
                    <div className="relative">
                      <select 
                        value={itemToEdit.category} 
                        onChange={e => setItemToEdit({...itemToEdit, category: e.target.value})} 
                        className="w-full p-5 border-none rounded-[1.8rem] text-base font-bold bg-gray-50/80 focus:bg-white focus:ring-4 focus:ring-[#800000]/5 outline-none transition-all shadow-inner appearance-none pr-10"
                      >
                        {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">UOM</label>
                    <input 
                      type="text" 
                      value={itemToEdit.uom} 
                      onChange={e => setItemToEdit({...itemToEdit, uom: e.target.value})} 
                      className="w-full p-5 border-none rounded-[1.8rem] text-base font-bold bg-gray-50/80 focus:bg-white focus:ring-4 focus:ring-[#800000]/5 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">UNIT COST (₱)</label>
                    <input 
                      type="number" 
                      value={itemToEdit.unitCost} 
                      onChange={e => setItemToEdit({...itemToEdit, unitCost: parseFloat(e.target.value) || 0})} 
                      className="w-full p-5 border-none rounded-[1.8rem] text-base font-bold bg-gray-50/80 focus:bg-white focus:ring-4 focus:ring-[#800000]/5 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">PAR STOCK</label>
                    <input 
                      type="number" 
                      value={itemToEdit.parStock} 
                      onChange={e => setItemToEdit({...itemToEdit, parStock: parseFloat(e.target.value) || 0})} 
                      className="w-full p-5 border-none rounded-[1.8rem] text-base font-bold bg-gray-50/80 focus:bg-white focus:ring-4 focus:ring-[#800000]/5 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-5 bg-gray-50/80 rounded-[1.8rem] shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl text-[#800000]"><Calendar size={18} /></div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block">Expiration Track</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Enable FEFO monitoring</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const isPerp = itemToEdit.earliestExpiry === '2099-12-31';
                        const newExpiry = isPerp ? new Date().toISOString().split('T')[0] : '2099-12-31';
                        // Propagate change to batches to ensure syncAggregates doesn't overwrite it
                        const newBatches = itemToEdit.batches.map(b => ({ ...b, expiry: newExpiry }));
                        setItemToEdit({
                          ...itemToEdit,
                          earliestExpiry: newExpiry,
                          batches: newBatches
                        });
                      }}
                      className={`w-14 h-7 rounded-full transition-all relative ${itemToEdit.earliestExpiry !== '2099-12-31' ? 'bg-[#800000]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${itemToEdit.earliestExpiry !== '2099-12-31' ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>

                  {itemToEdit.earliestExpiry !== '2099-12-31' && (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">EARLIEST EXPIRY</label>
                      <input 
                        type="date" 
                        value={itemToEdit.earliestExpiry} 
                        onChange={e => {
                          const val = e.target.value;
                          const newBatches = itemToEdit.batches.map(b => ({ ...b, expiry: val }));
                          setItemToEdit({...itemToEdit, earliestExpiry: val, batches: newBatches});
                        }} 
                        className="w-full p-5 border-none rounded-[1.8rem] text-base font-bold bg-gray-50/80 focus:bg-white focus:ring-4 focus:ring-[#800000]/5 outline-none transition-all shadow-inner"
                      />
                    </div>
                  )}
                </div>
             </div>
             
             {/* Footer */}
             <div className="px-8 py-7 flex justify-between items-center bg-white border-t border-gray-50">
                <button 
                  onClick={() => setIsEditingInventoryItem(false)} 
                  className="px-4 py-2 text-[12px] font-black uppercase text-gray-400 hover:text-gray-700 transition-colors tracking-widest"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSaveEditItem} 
                  className="bg-[#800000] text-white px-10 py-5 rounded-[1.8rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-[0_15px_30px_-5px_rgba(128,0,0,0.4)] hover:translate-y-[-2px] active:translate-y-0 active:shadow-lg transition-all"
                >
                  SAVE CHANGES
                </button>
             </div>
          </div>
        </div>
      )}

      {isCheckingOut && (
        <div className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Verification</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Acknowledgement Required</p>
              </div>
              <button onClick={() => setIsCheckingOut(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={labelClass}>Receiver Name</label>
                  <input type="text" placeholder="Full Name" value={receiverName} onChange={e => setReceiverName(e.target.value)} className={modalInputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Department</label>
                  <select value={receiverDept} onChange={e => setReceiverDept(e.target.value)} className={modalInputClass}>
                    {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              
              <SignaturePad onSave={setSignature} onClear={() => setSignature(null)} />
            </div>

            <div className="p-8 border-t bg-gray-50 flex gap-4">
              <button onClick={() => setIsCheckingOut(false)} className="flex-1 py-4 border border-gray-200 text-gray-400 font-black uppercase text-[10px] rounded-2xl">Back</button>
              <button 
                disabled={!signature || !receiverName}
                onClick={handleFinalIssue}
                className="flex-1 py-4 bg-[#800000] text-white font-black uppercase text-[10px] rounded-2xl shadow-lg disabled:opacity-30 active:scale-95 transition-all"
              >
                Confirm Release
              </button>
            </div>
          </div>
        </div>
      )}

      {isUserSelectorOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 w-full max-sm text-center space-y-8 shadow-2xl animate-in zoom-in-95">
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Switch User</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Select your identity</p>
            </div>
            <div className="space-y-3">
              {users.map(u => (
                <button 
                  key={u.id} 
                  onClick={() => selectUserRequest(u)}
                  className={`w-full p-5 rounded-3xl flex items-center justify-between border shadow-sm active:scale-95 transition-all ${currentUser?.id === u.id ? 'border-[#800000] bg-[#800000]/5' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-full"><Users size={16} className="text-gray-400"/></div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900">{u.name}</p>
                      <p className="text-[9px] font-black uppercase text-gray-400">{u.role}</p>
                    </div>
                  </div>
                  {currentUser?.id === u.id && <Check size={16} className="text-[#800000]" />}
                </button>
              ))}
            </div>
            <button onClick={() => setIsUserSelectorOpen(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dismiss</button>
          </div>
        </div>
      )}

      {isPasswordPromptOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`bg-white rounded-[2.5rem] p-10 w-full max-sm text-center space-y-8 border-4 border-[#800000]/10 ${passwordError ? 'animate-shake' : 'animate-in zoom-in-95'}`}>
            <div className="w-16 h-16 bg-[#800000]/5 text-[#800000] rounded-full flex items-center justify-center mx-auto"><ShieldCheck size={32} /></div>
            <div className="space-y-2"><h3 className="text-sm font-black uppercase tracking-widest">Verification</h3><p className="text-[9px] font-bold text-gray-400 uppercase">Enter Authorization Key</p></div>
            <input autoFocus type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} className="w-full text-center text-4xl font-black tracking-[0.5em] outline-none border-b-4 border-[#800000] pb-2" />
            <div className="flex gap-4"><button onClick={() => { setIsPasswordPromptOpen(false); setPendingUser(null); }} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase">Cancel</button><button onClick={handleVerifyPassword} className="flex-1 py-4 bg-[#800000] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Verify</button></div>
          </div>
        </div>
      )}

      {isPasswordChangeOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-sm text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#800000]/5 text-[#800000] rounded-full flex items-center justify-center mx-auto"><Key size={32} /></div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Security Protocol</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Change Admin Authorization Key</p>
            </div>
            <input 
              type="password" 
              placeholder="Enter New Numeric Key" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              className="w-full text-center text-3xl font-black tracking-widest outline-none border-b-2 border-[#800000] py-4" 
            />
            <div className="flex gap-4">
               <button onClick={() => setIsPasswordChangeOpen(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase">Cancel</button>
               <button onClick={handlePasswordUpdate} className="flex-1 py-4 bg-[#800000] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Update Key</button>
            </div>
          </div>
        </div>
      )}

      {isManageModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Manage {manageTarget}</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">System Configuration Panel</p>
              </div>
              <button onClick={() => setIsManageModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="space-y-4">
                <label className={labelClass}>Add New Entry</label>
                <div className="flex gap-3">
                  <input type="text" placeholder={`Enter ${manageTarget?.slice(0,-1)} name...`} value={manageInput} onChange={e => setManageInput(e.target.value)} className={modalInputClass} />
                  {manageTarget === 'users' && (
                    <select value={manageRole} onChange={e => setManageRole(e.target.value as any)} className="px-4 border border-gray-100 rounded-xl text-[10px] font-black uppercase bg-gray-50 outline-none">
                      <option value="Staff">Staff</option>
                      <option value="Manager">Manager</option>
                    </select>
                  )}
                  <button onClick={handleManageSubmit} className="p-4 bg-[#800000] text-white rounded-xl shadow-lg active:scale-95 transition-all"><Plus size={20} /></button>
                </div>
              </div>

              <div className="space-y-4">
                <label className={labelClass}>Active {manageTarget}</label>
                <div className="grid grid-cols-1 gap-3">
                  {(manageTarget === 'users' ? users : 
                    manageTarget === 'categories' ? availableCategories :
                    manageTarget === 'zones' ? availableZones :
                    availableDepartments).map((item, idx) => {
                      let name = typeof item === 'string' ? item : item.name;
                      let role = typeof item === 'string' ? null : item.role;
                      return (
                        <div key={idx} className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className="p-2 bg-white rounded-xl shadow-sm text-gray-400">
                               {manageTarget === 'users' ? <Users size={16}/> : 
                                manageTarget === 'categories' ? <Tag size={16}/> :
                                manageTarget === 'zones' ? <Building size={16}/> : <Briefcase size={16}/>}
                             </div>
                             <div>
                               <p className="text-xs font-black text-gray-900">{name}</p>
                               {role && <p className="text-[8px] font-black uppercase text-[#800000] tracking-widest">{role}</p>}
                             </div>
                          </div>
                          <button onClick={() => handleManageDelete(item)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setIsManageModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-[10px]">Close</button>
            </div>
          </div>
        </div>
      )}

      {isAddingItem && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
             <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-[#800000]">Receive Inventory</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase">Logging Batch: {currentAutoBatchId}</p>
               </div>
               <button onClick={() => setIsAddingItem(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar pb-12">
                <div className="space-y-1.5 relative">
                  <label className={labelClass}>Item Description</label>
                  <input 
                    type="text" 
                    placeholder="Search or Enter New Name" 
                    value={newItemData.name} 
                    onChange={e => {
                      setNewItemData({...newItemData, name: e.target.value});
                      setShowReceiveSuggestions(true);
                    }} 
                    onFocus={() => setShowReceiveSuggestions(true)}
                    className={modalInputClass} 
                  />
                  {showReceiveSuggestions && receiveSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[1001] mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                       {receiveSuggestions.map(item => (
                         <button 
                           key={item.id} 
                           onClick={() => {
                             setNewItemData({
                               ...newItemData, 
                               name: item.name, 
                               category: item.category, 
                               uom: item.uom,
                               unitCost: item.unitCost,
                               parStock: item.parStock
                             });
                             setShowReceiveSuggestions(false);
                           }}
                           className="w-full text-left p-4 hover:bg-[#800000]/5 flex items-center justify-between group transition-colors border-b last:border-0 border-gray-50"
                         >
                            <div>
                               <p className="text-xs font-black text-gray-800">{item.name}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase">{item.sku} • {item.category}</p>
                            </div>
                            <Plus size={14} className="text-gray-300 group-hover:text-[#800000] transition-colors" />
                         </button>
                       ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Category</label>
                    <select value={newItemData.category} onChange={e => setNewItemData({...newItemData, category: e.target.value})} className={modalInputClass}>
                      {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>UOM (Unit)</label>
                    <input type="text" placeholder="e.g. Sack, Case" value={newItemData.uom} onChange={e => setNewItemData({...newItemData, uom: e.target.value})} className={modalInputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Receive Qty</label>
                    <input type="number" value={newItemData.receivedQty} onChange={e => setNewItemData({...newItemData, receivedQty: parseFloat(e.target.value) || 0})} className={modalInputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Storage Zone</label>
                    <select value={newItemData.restockZone} onChange={e => setNewItemData({...newItemData, restockZone: e.target.value})} className={modalInputClass}>
                      {availableZones.map(z => <option key={z} value={z}>{z.split(' (')[0]}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl text-[#800000]"><Calendar size={18} /></div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block">Expiration Track</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Does this item expire?</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setItemHasExpiry(!itemHasExpiry)}
                      className={`w-12 h-6 rounded-full transition-all relative ${itemHasExpiry ? 'bg-[#800000]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${itemHasExpiry ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {itemHasExpiry && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                      <label className={labelClass}>Batch Expiry (FEFO)</label>
                      <input type="date" value={newItemData.earliestExpiry} onChange={e => setNewItemData({...newItemData, earliestExpiry: e.target.value})} className={modalInputClass} />
                    </div>
                  )}

                  {!itemHasExpiry && (
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                      <CalendarOff size={16} className="text-blue-500" />
                      <p className="text-[9px] font-black uppercase text-blue-600">Items without expiry are issued after all expiring batches are cleared.</p>
                    </div>
                  )}
                </div>
             </div>
             <div className="p-8 border-t flex gap-4 bg-white">
                <button onClick={() => setIsAddingItem(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400">Cancel</button>
                <button onClick={handleCommitStockEntry} className="flex-1 py-4 bg-[#800000] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Receive Batch</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;