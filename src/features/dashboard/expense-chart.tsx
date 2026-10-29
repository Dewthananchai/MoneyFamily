"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
}

interface ExpenseChartProps {
  data: MonthlyChartData[];
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-950 text-white p-3 rounded-xl shadow-xl text-xs border border-navy-800">
          <p className="font-bold mb-1 text-slate-300">{label}</p>
          <p className="text-brand-yellow font-medium">
            รายรับ: ฿{payload[0]?.value?.toLocaleString()}
          </p>
          <p className="text-brand-orange font-medium">
            รายจ่าย: ฿{payload[1]?.value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            📊 สถิติรายรับ - รายจ่าย
          </h2>
          <p className="text-xs text-slate-500">
            เปรียบเทียบกระแสเงินสดในครอบครัว
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-amber"></span>
            <span className="text-slate-600 font-medium">รายรับ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-navy-800"></span>
            <span className="text-slate-600 font-medium">รายจ่าย</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barGap={6}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 11 }}
              tickFormatter={(val) => `฿${val > 999 ? (val / 1000).toFixed(0) + "k" : val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="income"
              name="รายรับ"
              fill="#F59E0B"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="expense"
              name="รายจ่าย"
              fill="#0F2038"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

