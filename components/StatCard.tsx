import React from 'react';
import { StatCardProps } from '../types';

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-100 group">
      <div>
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mt-2 group-hover:text-blue-600 transition-colors">{value}</h3>
      </div>
      <div className={`p-4 rounded-xl ${color} text-white shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<any>, { size: 24 })
          : icon}
      </div>
    </div>
  );
};

export default StatCard;