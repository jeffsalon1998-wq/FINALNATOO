import React, { useState } from 'react';
import { InventoryItem, Zone } from '../types';
import { Minus, Plus as PlusIcon, Edit3, ChevronRight, MapPin, AlertCircle } from 'lucide-react';

interface ItemCardProps {
  item: InventoryItem;
  selectedZone: Zone | 'All Zones';
  onIssue: (item: InventoryItem, qty: number, targetZone?: string) => void;
  onEdit: (item: InventoryItem) => void;
  isAuditMode: boolean;
  auditCount?: number;
  onAuditCountChange: (itemId: string, count: number) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, selectedZone, onIssue, onEdit, isAuditMode, auditCount, onAuditCountChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isGlobal = selectedZone === 'All Zones';
  
  const stockInZone = isGlobal 
    ? (Object.values(item.stock) as number[]).reduce((a, b) => a + b, 0)
    : (item.stock[selectedZone as string] || 0);

  const totalStock = (Object.values(item.stock) as number[]).reduce((a, b) => a + b, 0);
  const isBelowPar = totalStock <= item.parStock * 0.4;
  
  const isPerpetual = item.earliestExpiry === '2099-12-31';
  const expiryDate = new Date(item.earliestExpiry);
  const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = !isPerpetual && diffDays <= 0;
  const isExpiringSoon = !isPerpetual && diffDays <= 90 && diffDays > 0;
  
  const [issueQty, setIssueQty] = useState<number>(1);

  const handleQtyChange = (val: number) => {
    const newQty = Math.min(stockInZone, Math.max(1, val));
    setIssueQty(newQty);
  };

  const activeBatches = item.batches
    .filter(b => b.quantity > 0)
    .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
  
  const fefoZone = activeBatches.length > 0 ? activeBatches[0].zone : undefined;

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all active:scale-[0.99] touch-manipulation ${
        isExpanded ? 'ring-2 ring-[#800000]/5 border-[#800000]/20' : 'border-gray-100'
      }`}
    >
      {(isExpired || isExpiringSoon || isBelowPar) && (
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isExpired ? 'bg-red-500' : 'bg-amber-400'
        }`} />
      )}
      
      <div className="flex justify-between items-start gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
              {item.sku.split('-').pop()}
            </span>
            {(isExpired || isExpiringSoon) && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 ${
                isExpired ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <AlertCircle size={8} />
                {isExpired ? 'Expired' : `${diffDays} Days`}
              </span>
            )}
          </div>
          
          <h3 className="font-black text-gray-900 text-[13px] leading-tight uppercase truncate pr-2">
            {item.name}
          </h3>
          
          <div className="flex items-center gap-2 mt-1.5">
            <div className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
              <span className="font-black text-[#800000] text-[11px] uppercase">
                {stockInZone} {item.uom}
              </span>
            </div>
            {item.unitCost > 0 && (
              <span className="text-[9px] font-bold text-gray-400 uppercase">
                ₱{item.unitCost.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
            isExpanded ? 'bg-[#800000] text-white rotate-90' : 'bg-gray-50 text-gray-300'
          }`}>
            <ChevronRight size={16} strokeWidth={3} />
          </div>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[300px] opacity-100 mt-4 pt-4 border-t border-gray-50' : 'max-h-0 opacity-0'
      }`}>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center bg-gray-50 rounded-xl h-12 border border-gray-100 p-1">
            <button 
              disabled={stockInZone === 0 || issueQty <= 1}
              onClick={() => handleQtyChange(issueQty - 1)}
              className="w-10 h-full flex items-center justify-center text-gray-400 active:text-[#800000] disabled:opacity-30"
            >
              <Minus size={16} strokeWidth={3} />
            </button>
            <div className="h-6 w-[1px] bg-gray-200 mx-1" />
            <input 
              type="number" 
              value={issueQty}
              onChange={e => handleQtyChange(parseInt(e.target.value, 10) || 1)}
              className="w-12 text-center bg-transparent text-sm font-black text-gray-900 outline-none"
            />
            <div className="h-6 w-[1px] bg-gray-200 mx-1" />
            <button 
              disabled={stockInZone === 0 || issueQty >= stockInZone}
              onClick={() => handleQtyChange(issueQty + 1)}
              className="w-10 h-full flex items-center justify-center text-gray-400 active:text-[#800000] disabled:opacity-30"
            >
              <PlusIcon size={16} strokeWidth={3} />
            </button>
          </div>
          
          <button
            onClick={() => { 
              onIssue(item, issueQty, isGlobal ? fefoZone : undefined); 
              setIssueQty(1); 
            }}
            disabled={stockInZone === 0}
            className="flex-1 h-12 bg-[#800000] text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-red-900/10"
          >
            Issue
          </button>
          
          <button 
            onClick={() => onEdit(item)}
            className="w-12 h-12 flex items-center justify-center border border-gray-100 rounded-xl text-gray-400 active:bg-gray-50 active:scale-95 transition-all"
          >
            <Edit3 size={18} />
          </button>
        </div>

        {isAuditMode && (
          <div className="mt-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center bg-green-50 border border-green-200 rounded-xl p-3">
              <span className="text-green-700 font-black text-[9px] uppercase tracking-wider mr-3">Audit Count</span>
              <input 
                type="number"
                value={auditCount ?? ''}
                placeholder="0"
                onChange={(e) => onAuditCountChange(item.id, parseInt(e.target.value, 10) || 0)}
                className="flex-1 w-full text-right bg-transparent text-lg font-black text-green-800 outline-none placeholder:text-green-800/30"
              />
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 p-2 rounded-lg">
          <div className="flex items-center gap-1.5">
            <MapPin size={10} className="text-[#800000]" />
            <span>{isGlobal ? 'Global FEFO' : selectedZone.split(' (')[0]}</span>
          </div>
          <span className="text-gray-300">|</span>
          <span>Par Level: {item.parStock}</span>
        </div>
      </div>
    </div>
  );
};