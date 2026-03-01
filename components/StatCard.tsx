
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => {
  return (
    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 active:scale-95 transition-all">
      <div className="flex items-center justify-between text-gray-400">
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        <div className="text-gray-300">{icon}</div>
      </div>
      <div className="text-xl font-black text-[#800000] leading-none tracking-tight">
        {value}
      </div>
    </div>
  );
};
