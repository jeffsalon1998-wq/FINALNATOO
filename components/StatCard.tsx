
import React from 'react';
import { COLORS } from '../constants';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => {
  return (
    <div className="bg-white p-2.5 border rounded-lg shadow-sm flex flex-col justify-between h-16 group transition-all">
      <div className="flex items-center justify-between text-gray-400 font-black text-[8px] uppercase tracking-widest">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-base font-black leading-none" style={{ color: COLORS.MAROON }}>
        {value}
      </div>
    </div>
  );
};
