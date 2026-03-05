import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { InventoryItem } from '../types';
import { db } from '../db';

export const useInventory = () => {
  const { inventory, setInventory, availableZones } = useStore();

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

  const getFilteredInventory = (searchTerm: string, selectedZone: string, selectedCategory: string) => {
    return useMemo(() => (inventory || []).filter(i => {
      const term = (searchTerm || '').toLowerCase().trim();
      const GLOBAL_ZONE_KEY = 'All Zones';
      const GLOBAL_CATEGORY_KEY = 'All Categories';

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
  };

  const stockValue = useMemo(() => {
    return (inventory || []).reduce((total, item) => {
      const totalQty = (Object.values(item.stock || {}) as number[]).reduce((sum, qty) => sum + qty, 0);
      return total + (totalQty * (item.unitCost || 0));
    }, 0);
  }, [inventory]);

  const updateItem = async (updatedItem: InventoryItem) => {
    const updatedWithAggregates = syncAggregates(updatedItem);
    const updated = (inventory || []).map(i => i.id === updatedWithAggregates.id ? updatedWithAggregates : i);
    await db.updateInventory([updatedWithAggregates]);
    setInventory([...updated]);
  };

  const deleteItem = async (id: string) => {
    await db.deleteInventoryItem(id);
    const updated = (inventory || []).filter(i => i.id !== id);
    setInventory([...updated]);
  };

  return {
    inventory,
    stockValue,
    getFilteredInventory,
    syncAggregates,
    updateItem,
    deleteItem,
  };
};
