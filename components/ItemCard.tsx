import React, { useState } from 'react';
import { InventoryItem, Zone } from '../types';

import { Minus, Plus as PlusIcon, Edit3, ChevronRight, MapPin } from 'lucide-react';

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
  
  // Fix: Explicitly cast Object.values to number[] for safe reduce addition
  const stockInZone = isGlobal 
    ? (Object.values(item.stock) as number[]).reduce((a, b) => a + b, 0)
    : (item.stock[selectedZone as string] || 0);

  // Fix: Explicitly cast Object.values to number[] to calculate totalStock correctly
  const totalStock = (Object.values(item.stock) as number[]).reduce((a, b) => a + b, 0);
  // Fix: Comparison works correctly now that totalStock is inferred as a number
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
      className={`bg-white border rounded-2xl px-4 py-4 shadow-sm relative overflow-hidden transition-all duration-200 cursor-pointer border-gray-100 ${
        isExpanded ? 'ring-1 ring-[#800000]/10 border-[#800000]/20' : ''
      }`}
    >
      {/* Left border indicator for special states */}
      {(isExpired || isExpiringSoon || isBelowPar) && (
        <div className={`absolute left-0 top-0 w-1.5 h-full ${
          isExpired ? 'bg-red-500' : 'bg-amber-400'
        }`} />
      )}
      
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-0.5">
            SKU- {item.sku.split('-').pop()}
          </span>
          <h3 className="font-black text-gray-900 text-[14px] leading-tight uppercase pr-2">
            {item.name}
          </h3>
          
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            <span className="font-black text-gray-500 uppercase">
              {stockInZone} {item.uom}
            </span>
            <span className="text-gray-200 font-bold">•</span>
            <span className={`font-bold uppercase ${
              isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-600' : 'text-gray-400'
            }`}>
              {isPerpetual ? 'No Expiry' : `Exp: ${new Date(item.earliestExpiry).toLocaleDateString()}`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            {item.unitCost > 0 && (
              <div className="text-gray-900 px-2 py-1 text-[11px] font-black uppercase">
                ₱{item.unitCost.toFixed(2)}
              </div>
            )}
            {(isExpiringSoon || isBelowPar) && (
              <div className="bg-amber-400 text-[#800000] px-2 py-1 rounded-lg text-[9px] font-black shadow-sm uppercase">
                {isExpiringSoon ? `${diffDays}D` : 'LOW'}
              </div>
            )}
          </div>
          <ChevronRight size={16} className={`text-gray-200 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Action Tray */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-64 opacity-100 mt-4 pt-4 border-t border-gray-50' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl h-12 border border-gray-100">
            <button 
              disabled={stockInZone === 0 || issueQty <= 1}
              onClick={() => handleQtyChange(issueQty - 1)}
              className="w-12 h-full flex items-center justify-center text-gray-400 active:bg-gray-100"
            >
              <Minus size={16} strokeWidth={3} />
            </button>
            <input 
              type="number" 
              value={issueQty}
              onChange={e => handleQtyChange(parseInt(e.target.value, 10) || 1)}
              className="h-full w-16 text-center bg-transparent text-sm font-black text-gray-800 outline-none"
            />
            <button 
              disabled={stockInZone === 0 || issueQty >= stockInZone}
              onClick={() => handleQtyChange(issueQty + 1)}
              className="w-12 h-full flex items-center justify-center text-gray-400 active:bg-gray-100"
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
            className="flex-[1.5] h-12 bg-[#800000] text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-20 transition-all shadow-md"
          >
            Issue Stock
          </button>
          <button 
            onClick={() => onEdit(item)}
            className="w-12 h-12 flex items-center justify-center border border-gray-100 rounded-xl text-gray-300 active:bg-gray-50"
          >
            <Edit3 size={18} />
          </button>
        </div>
        {isAuditMode && (
          <div className="mt-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center bg-green-50 border border-green-200 rounded-xl p-2">
              <span className="text-green-800 font-black text-xs mr-4">AUDIT COUNT:</span>
              <input 
                type="number"
                value={auditCount ?? ''}
                placeholder="Enter count..."
                onChange={(e) => onAuditCountChange(item.id, parseInt(e.target.value, 10) || 0)}
                className="flex-1 w-full text-right bg-transparent text-lg font-black text-green-900 outline-none"
              />
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-wider">
          <MapPin size={12} className="text-[#800000]" />
          <span>Loc: {isGlobal ? 'Global FEFO' : selectedZone.split(' (')[0]}</span>
          <span className="ml-auto">Par: {item.parStock}</span>
        </div>
      </div>
    </div>
  );
};