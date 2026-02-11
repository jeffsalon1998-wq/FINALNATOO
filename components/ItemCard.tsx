import React, { useState } from 'react';
import { InventoryItem, Zone } from '../types';
import { COLORS } from '../constants';
import { TrendingUp, Minus, Plus as PlusIcon, Edit3, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, MapPin, Globe, Clock, CalendarOff, ChevronRight, Sparkles } from 'lucide-react';

interface ItemCardProps {
  item: InventoryItem;
  selectedZone: Zone | 'All Zones';
  onIssue: (item: InventoryItem, qty: number) => void;
  onEdit: (item: InventoryItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, selectedZone, onIssue, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isGlobal = selectedZone === 'All Zones';
  
  // Calculate stock to display
  const stockInZone = isGlobal 
    ? item.batches.reduce((sum, b) => sum + b.quantity, 0)
    : (item.stock[selectedZone as string] || 0);

  const totalStock = item.batches.reduce((sum, b) => sum + b.quantity, 0);
  const isBelowPar = totalStock <= item.parStock * 0.4;
  const isAutoAdjusted = item.parStock !== item.initialParStock;

  // Handle "No Expiry" (2099 date)
  const isPerpetual = item.earliestExpiry === '2099-12-31';
  const expiryDate = new Date(item.earliestExpiry);
  const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = !isPerpetual && diffDays <= 0;
  const isExpiringSoon = !isPerpetual && diffDays <= 90 && diffDays > 0;
  
  const [issueQty, setIssueQty] = useState<number>(1);
  const [showBatches, setShowBatches] = useState(false);

  const handleQtyChange = (val: number) => {
    const newQty = Math.min(stockInZone, Math.max(1, val));
    setIssueQty(newQty);
  };

  const activeBatches = item.batches
    .filter(b => (isGlobal || b.zone === selectedZone) && b.quantity > 0)
    .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`bg-white border rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden flex flex-col transition-all duration-300 ease-in-out cursor-pointer ${
        isExpanded ? 'ring-2 ring-[#800000]/10 shadow-xl border-[#800000]/20' : 'hover:shadow-md hover:border-gray-300'
      } ${isExpired ? 'border-red-200' : ''}`}
    >
      {/* Visual Indicator Bars */}
      {isExpired && <div className="absolute left-0 top-0 w-1.5 h-full bg-red-500" />}
      {!isExpired && isExpiringSoon && <div className="absolute left-0 top-0 w-1.5 h-full" style={{ backgroundColor: COLORS.GOLD }} />}
      {!isExpired && !isExpiringSoon && isBelowPar && <div className="absolute left-0 top-0 w-1.5 h-full bg-amber-400" />}
      
      {/* Header - Always Visible */}
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-black text-gray-300 uppercase block truncate tabular-nums tracking-widest">SKU- {item.sku.split('-').pop()}</span>
            {isExpanded && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="text-gray-300 hover:text-[#800000] transition-colors p-0.5"
              >
                <Edit3 size={11} strokeWidth={3} />
              </button>
            )}
          </div>
          <h3 className={`font-black text-gray-900 leading-tight pr-4 tracking-tight transition-all ${isExpanded ? 'text-lg' : 'text-sm'}`}>
            {item.name}
          </h3>
          
          {/* Collapsed view stock summary */}
          {!isExpanded && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-black tabular-nums ${totalStock <= item.parStock * 0.4 ? 'text-red-500' : 'text-gray-500'}`}>
                {stockInZone} {item.uom}
              </span>
              <div className="h-1 w-1 rounded-full bg-gray-200" />
              <span className={`text-[9px] font-bold ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-600' : 'text-gray-400'}`}>
                {isPerpetual ? 'No Expiry' : `Exp: ${item.earliestExpiry}`}
              </span>
              {isAutoAdjusted && (
                <Sparkles size={10} className="text-purple-400 animate-pulse" />
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex gap-1">
            {isExpired && (
              <div className="bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase">Expired</div>
            )}
            {!isExpanded && !isExpired && isExpiringSoon && (
              <div className="bg-amber-400 text-[#800000] px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase">{diffDays}D</div>
            )}
            {!isExpanded && isBelowPar && (
              <div className="bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase">Low</div>
            )}
            {!isExpanded && (
              <ChevronRight size={14} className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            )}
          </div>
          
          {isExpanded && (
            <div className="flex flex-col items-end gap-1 mt-1">
              <div className="flex gap-1">
                {isExpired && (
                   <div className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider">Expired</div>
                )}
                {item.isFastMoving && (
                  <div className="bg-[#800000] text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider">Fast</div>
                )}
                {isAutoAdjusted && (
                   <div className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border border-purple-200 flex items-center gap-1">
                     <Sparkles size={8} /> Adjusted
                   </div>
                )}
                {isExpiringSoon && !isExpired && (
                  <div className="bg-amber-400 text-[#800000] px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm">{diffDays}D</div>
                )}
                {isPerpetual && (
                  <div className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider">Perpetual</div>
                )}
              </div>
              {isBelowPar && (
                <div className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1">
                  Low Stock
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1.5">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">FEFO (Expiry)</p>
            <p className={`text-sm font-black tabular-nums ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : isPerpetual ? 'text-blue-500' : 'text-gray-600'}`}>
              {isPerpetual ? 'No Expiration' : item.earliestExpiry}
            </p>
          </div>
          <div className="text-right space-y-1.5">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">{isGlobal ? 'Global Stock' : 'Zone Stock'}</p>
            <div className="flex items-baseline justify-end gap-1.5">
               <span className={`text-xl font-black tabular-nums ${totalStock <= item.parStock * 0.4 ? 'text-red-500' : 'text-gray-900'}`}>
                 {stockInZone} / {item.parStock}
               </span>
               <span className="text-[10px] text-gray-400 font-black uppercase">{item.uom}</span>
            </div>
          </div>
        </div>

        {/* Batch Breakdown Section */}
        <div className="mb-6">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowBatches(!showBatches); }}
            className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-400 hover:text-[#800000] transition-colors w-full tracking-[0.15em] py-2 border-t border-gray-50"
          >
            {showBatches ? <ChevronUp size={12} strokeWidth={3}/> : <ChevronDown size={12} strokeWidth={3}/>}
            {showBatches ? 'Hide' : 'View'} {activeBatches.length} {isGlobal ? 'Global' : 'Local'} Batches
          </button>
          {showBatches && (
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto no-scrollbar pb-1 animate-in slide-in-from-top-2">
              {activeBatches.map(b => {
                const isInfinite = b.expiry === '2099-12-31';
                const bDiff = Math.ceil((new Date(b.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const bExpired = !isInfinite && bDiff <= 0;
                const bExpiring = !isInfinite && bDiff <= 90 && bDiff > 0;
                
                return (
                  <div key={`${b.id}-${b.zone}`} className="bg-gray-50/50 px-4 py-2.5 rounded-2xl border border-gray-100 flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-black tabular-nums ${bExpired ? 'text-red-500' : bExpiring ? 'text-amber-500' : isInfinite ? 'text-blue-500' : 'text-gray-400'}`}>
                        {isInfinite ? 'No Expiration' : b.expiry}
                      </span>
                      <span className="text-gray-800 font-black tabular-nums">{b.quantity} {item.uom}</span>
                    </div>
                    {isGlobal && (
                      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-gray-300 tracking-widest">
                        <MapPin size={10} /> {b.zone.split(' (')[0]}
                      </div>
                    )}
                  </div>
                );
              })}
              {activeBatches.length === 0 && <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest text-center py-4">Zero Inventory</p>}
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3">
          {!isGlobal ? (
            <>
              <div className="flex items-center justify-between bg-gray-50/80 rounded-2xl p-1.5 border border-gray-100 h-14 shadow-inner" onClick={e => e.stopPropagation()}>
                  <button 
                    disabled={stockInZone === 0 || issueQty <= 1}
                    onClick={(e) => { e.stopPropagation(); handleQtyChange(issueQty - 1); }}
                    className="w-12 h-full flex items-center justify-center text-gray-400 disabled:opacity-20 active:scale-90 transition-all"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <div className="flex-1 bg-white mx-1 h-full rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                     <span className="text-lg font-black text-gray-800 tabular-nums">{issueQty}</span>
                  </div>
                  <button 
                    disabled={stockInZone === 0 || issueQty >= stockInZone}
                    onClick={(e) => { e.stopPropagation(); handleQtyChange(issueQty + 1); }}
                    className="w-12 h-full flex items-center justify-center text-gray-400 disabled:opacity-20 active:scale-90 transition-all"
                  >
                    <PlusIcon size={18} strokeWidth={3} />
                  </button>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); onIssue(item, issueQty); setIssueQty(1); }}
                disabled={stockInZone === 0}
                className={`w-full py-4 text-[11px] font-black uppercase tracking-[0.25em] rounded-2xl shadow-lg transition-all active:scale-[0.96] ${
                  stockInZone === 0 
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' 
                    : 'bg-[#800000] text-white hover:bg-[#600000] shadow-maroon-100/50'
                }`}
              >
                {stockInZone === 0 ? 'Out of Stock' : `Issue ${issueQty} ${item.uom}`}
              </button>
            </>
          ) : (
            <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center gap-3">
              <Globe size={16} className="text-gray-300" />
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-center leading-tight">
                Select Warehouse Zone<br/>to Authorize Issue
              </span>
            </div>
          )}
          
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            className="w-full py-2 text-[9px] font-black uppercase text-gray-300 hover:text-gray-500 transition-colors tracking-widest"
          >
            Show Less
          </button>
        </div>
      </div>
    </div>
  );
};