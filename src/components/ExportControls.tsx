import React, { useState } from 'react';
import { useExport } from '../hooks/useExport';
import { useStore } from '../store/useStore';

export const ExportControls: React.FC = () => {
  const { exportTransactionsToCSV } = useExport();
  const { startDate, setStartDate, endDate, setEndDate, loadAppData } = useStore();
  const [showPicker, setShowPicker] = useState(false);

  const handleExport = () => {
    if (startDate && endDate) {
      exportTransactionsToCSV(startDate, endDate);
    }
  };

  const handleDateChange = () => {
    if (startDate && endDate) {
      loadAppData(true, undefined, undefined, startDate, endDate);
    }
  };

  return (
    <div className="p-4 bg-white border rounded-2xl shadow-sm border-gray-100 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-black text-gray-800 uppercase">Export Transactions</h4>
        <button onClick={() => setShowPicker(!showPicker)} className="text-xs font-black text-gray-500">{showPicker ? 'Hide' : 'Show'}</button>
      </div>
      {showPicker && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <input
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleDateChange} className="w-full py-2 bg-gray-100 rounded-md text-xs font-black uppercase text-gray-800 shadow-sm active:scale-95 transition-transform">Apply Filter</button>
            <button onClick={handleExport} className="w-full py-2 bg-blue-500 rounded-md text-xs font-black uppercase text-white shadow-sm active:scale-95 transition-transform">Export to CSV</button>
          </div>
        </div>
      )}
    </div>
  );
};
