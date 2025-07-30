
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DailySale } from '../types';

interface SalesChartProps {
  data: DailySale[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" />
        <XAxis 
            dataKey="day" 
            tick={{ fill: '#1f2937', fontSize: 12 }} 
            label={{ value: '일차', position: 'insideBottom', offset: -5, fill: '#1f2937', fontSize: 12 }}
        />
        <YAxis 
            tick={{ fill: '#1f2937', fontSize: 12 }} 
            tickFormatter={(value) => `₩${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid #1f2937',
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '12px',
          }}
          labelFormatter={(label) => `${label}일차`}
          formatter={(value: number) => [`₩${value.toLocaleString()}`, '매출']}
        />
        <Bar dataKey="sales" fill="#4ade80" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;
