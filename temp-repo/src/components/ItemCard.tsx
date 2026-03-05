import React from 'react';
import { InventoryItem, Zone } from '../types';
import { Edit, Minus, Plus } from 'lucide-react';

interface ItemCardProps {
  item: InventoryItem;
  selectedZone: Zone;
  onIssue: (item: InventoryItem, quantity: number, zone?: Zone) => void;
  onEdit: (item: InventoryItem) => void;
  isAuditMode: boolean;
  auditCount?: number;
  onAuditCountChange: (itemId: string, count: number) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onIssue, onEdit, isAuditMode, auditCount, onAuditCountChange }) => {
  const totalStock = Object.values(item.stock || {}).reduce((a, b) => (a as number) + (b as number), 0);
  const isLowStock = totalStock <= (item.parStock || 0);

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm border-gray-100 flex flex-col gap-3 group">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">SKU: {item.sku}</span>
            {item.unitCost > 0 && (
              <span className="text-xs text-blue-600 font-mono bg-blue-100 px-1.5 py-0.5 rounded-md">₱{item.unitCost.toFixed(2)}</span>
            )}
          </div>
          <h4 className="text-sm font-black text-gray-800 uppercase leading-none mb-1.5">{item.name}</h4>
          <p className="text-[9px] font-bold text-gray-400 uppercase">
            {totalStock} {item.uom} • EXP: {item.earliestExpiry === '2099-12-31' ? 'N/A' : new Date(item.earliestExpiry).toLocaleDateString()}
          </p>
        </div>
        <div className={`text-xs font-black px-3 py-1.5 rounded-full ${isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
          {isLowStock ? 'LOW' : `${Math.round((totalStock / (item.initialParStock || 1)) * 30)}D`}
        </div>
      </div>

      {isAuditMode ? (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border">
          <span className="text-xs font-black text-gray-500 uppercase ml-2">Actual Count:</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onAuditCountChange(item.id, (auditCount || 0) - 1)}
              className="p-2 bg-white rounded-lg shadow-sm active:scale-95 transition-transform"
            >
              <Minus size={16} />
            </button>
            <input 
              type="number" 
              value={auditCount || ''} 
              onChange={(e) => onAuditCountChange(item.id, parseInt(e.target.value, 10) || 0)}
              className="w-20 text-center text-2xl font-black bg-transparent outline-none"
            />
            <button 
              onClick={() => onAuditCountChange(item.id, (auditCount || 0) + 1)}
              className="p-2 bg-white rounded-lg shadow-sm active:scale-95 transition-transform"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border">
          <button onClick={() => onIssue(item, 1)} className="flex-1 py-3 bg-white rounded-xl text-xs font-black uppercase text-[#800000] shadow-sm active:scale-95 transition-transform">Issue</button>
          <button onClick={() => onEdit(item)} className="p-3 ml-2 bg-white rounded-xl text-gray-400 shadow-sm active:scale-95 transition-transform"><Edit size={16} /></button>
        </div>
      )}
    </div>
  );
};
