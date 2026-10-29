"use client";

import React from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface SummaryCardsProps {
  income: number;
  expense: number;
  currency?: string;
}

export function SummaryCards({ income, expense, currency = "฿" }: SummaryCardsProps) {
  const balance = income - expense;

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
      {/* การ์ดยอดคงเหลือหลัก (Hero Card - Navy CI) */}
      <div className="bg-gradient-to-br from-navy-900 to-navy-950 text-white rounded-2xl p-4 md:p-5 shadow-lg relative overflow-hidden border border-navy-800">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-brand-amber/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-navy-300">เงินคงเหลือสุทธิ</span>
          <div className="w-8 h-8 rounded-full bg-brand-amber/20 flex items-center justify-center text-brand-amber">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {currency} {formatNumber(balance)}
        </div>
        <div className="mt-2 text-xs text-navy-300 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-yellow"></span>
          สถานะการเงินของครอบครัว
        </div>
      </div>

      {/* การ์ดรายรับรวม (Income - Golden Amber CI) */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-slate-500">รายรับทั้งหมด</span>
          <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            {currency} {formatNumber(income)}
          </div>
          <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-0.5 mt-1">
            <TrendingUp className="w-3 h-3" /> เงินเข้ากระเป๋า
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-brand-amber flex items-center justify-center">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      {/* การ์ดรายจ่ายรวม (Expense - Vibrant Orange CI) */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-slate-500">รายจ่ายทั้งหมด</span>
          <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            {currency} {formatNumber(expense)}
          </div>
          <span className="text-xs text-rose-500 font-medium inline-flex items-center gap-0.5 mt-1">
            <TrendingDown className="w-3 h-3" /> ยอดที่ใช้จ่ายไป
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center">
          <TrendingDown className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

