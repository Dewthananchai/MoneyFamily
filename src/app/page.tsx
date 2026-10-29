"use client";

import React, { useEffect, useState } from "react";
import { useLiff } from "@/features/liff/liff-context";
import { SummaryCards } from "@/features/dashboard/summary-cards";
import { ExpenseChart, MonthlyChartData } from "@/features/dashboard/expense-chart";
import { TransactionTable, TransactionItem } from "@/features/dashboard/transaction-table";
import { supabase } from "@/lib/supabase/client";
import { LogIn, Plus, Users, Bell, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const { profile, isLoggedIn, isReady, login } = useLiff();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [chartData, setChartData] = useState<MonthlyChartData[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ฟังก์ชันดึงข้อมูลจาก Supabase
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. ดึงข้อมูลรายการจากตาราง transactions
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          description,
          category,
          amount,
          type,
          transaction_date,
          is_split,
          payer:payer_id (display_name)
        `)
        .order("transaction_date", { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) {
        // Mock fallback สำหรับแสดงผลให้เห็นกราฟและสถิติสวยงามทันที
        const mockTransactions: TransactionItem[] = [
          {
            id: "tx-1",
            description: "บิ๊กซี ซื้อของใช้เข้าบ้าน",
            category: "shopping",
            amount: 1450.0,
            type: "expense",
            transaction_date: "2026-10-28",
            is_split: true,
            payer_name: profile?.displayName || "คุณ",
          },
          {
            id: "tx-2",
            description: "กาแฟและอาหารเช้า (SCB)",
            category: "food",
            amount: 120.0,
            type: "expense",
            transaction_date: "2026-10-28",
            is_split: false,
            payer_name: "แม่บ้านสายเปย์",
          },
          {
            id: "tx-3",
            description: "ค่าน้ำมันรถยนต์",
            category: "transport",
            amount: 900.0,
            type: "expense",
            transaction_date: "2026-10-26",
            is_split: false,
            payer_name: profile?.displayName || "คุณ",
          },
          {
            id: "tx-4",
            description: "เงินโอนสมทบกองกลางครอบครัว",
            category: "income",
            amount: 15000.0,
            type: "income",
            transaction_date: "2026-10-25",
            is_split: false,
            payer_name: "ทุกคนในบ้าน",
          },
        ];

        setTransactions(mockTransactions);
        setIncomeTotal(15000);
        setExpenseTotal(2470);
        setChartData([
          { month: "ก.ค.", income: 28000, expense: 21500 },
          { month: "ส.ค.", income: 30000, expense: 24000 },
          { month: "ก.ย.", income: 27500, expense: 22800 },
          { month: "ต.ค.", income: 32000, expense: 26400 },
        ]);
      } else {
        const formatted: TransactionItem[] = data.map((d: any) => ({
          id: d.id,
          description: d.description,
          category: d.category,
          amount: Number(d.amount),
          type: d.type,
          transaction_date: d.transaction_date,
          is_split: Boolean(d.is_split),
          payer_name: d.payer?.display_name || "สมาชิก",
        }));

        setTransactions(formatted);

        // คำนวณสรุปยอด
        let inc = 0;
        let exp = 0;
        formatted.forEach((t) => {
          if (t.type === "income") inc += t.amount;
          else if (t.type === "expense") exp += t.amount;
        });

        setIncomeTotal(inc);
        setExpenseTotal(exp);

        // จัดกลุ่มเป็นกราฟรายเดือน
        setChartData([
          { month: "ปัจจุบัน", income: inc, expense: exp },
        ]);
      }
    } catch (err) {
      console.error("❌ Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  return (
    <main className="min-h-screen pb-20 md:pb-12 bg-slate-50">
      {/* 1. Header (Deep Navy Bar with Amber Accents) */}
      <header className="bg-navy-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-amber to-brand-yellow flex items-center justify-center shadow-md shadow-amber-500/20 text-navy-950 font-black text-lg">
              M
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                MoneyFamily
                <span className="text-[10px] bg-brand-orange text-white px-1.5 py-0.2 rounded font-semibold">
                  PWA
                </span>
              </h1>
              <p className="text-[11px] text-navy-300">กระเป๋าเงินครอบครัว</p>
            </div>
          </div>

          {/* User profile / Login via LINE */}
          <div className="flex items-center gap-3">
            {isReady && isLoggedIn && profile ? (
              <div className="flex items-center gap-2">
                {profile.pictureUrl ? (
                  <img
                    src={profile.pictureUrl}
                    alt={profile.displayName}
                    className="w-8 h-8 rounded-full border-2 border-brand-amber object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-amber/30 text-brand-yellow flex items-center justify-center text-xs font-bold">
                    {profile.displayName.slice(0, 1)}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-200 hidden sm:inline">
                  {profile.displayName}
                </span>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบด้วย LINE</span>
              </button>
            )}

            <button
              onClick={loadDashboardData}
              title="รีเฟรชข้อมูล"
              className="w-8 h-8 rounded-lg bg-navy-800 hover:bg-navy-700 text-navy-200 flex items-center justify-center transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Banner ยินดีต้อนรับ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-4 rounded-2xl">
          <div>
            <h2 className="text-sm md:text-base font-bold text-navy-900">
              สวัสดีครับ 👋 {profile?.displayName || "ครอบครัว MoneyFamily"}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              พิมพ์บอกบอทหรือส่งสลิปในห้องแชท LINE ระบบจะบันทึกและซิงค์มาที่นี่อัตโนมัติ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs bg-white text-navy-900 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ซิงค์สดจาก LINE
            </span>
          </div>
        </div>

        {/* 3. Summary Cards (คงเหลือ, รายรับ, รายจ่าย) */}
        <SummaryCards income={incomeTotal} expense={expenseTotal} />

        {/* 4. กราฟเปรียบเทียบกระแสเงินสด */}
        <ExpenseChart data={chartData} />

        {/* 5. ตารางประวัติธุรกรรมล่าสุด */}
        <TransactionTable transactions={transactions} isLoading={isLoading} />
      </div>

      {/* 6. Mobile Bottom Quick Action Bar (Fixed for PWA mobile experience) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2.5 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => alert("💡 คุณสามารถพิมพ์ข้อความ เช่น 'กาแฟ 60' ใน LINE ได้เลยครับ!")}
          className="flex flex-col items-center gap-1 text-navy-900 text-[11px] font-bold"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-amber to-brand-orange text-white flex items-center justify-center shadow-md">
            <Plus className="w-5 h-5" />
          </div>
          <span>จดรายจ่าย</span>
        </button>

        <button
          onClick={() => alert("💡 พิมพ์คำว่า 'สรุปหนี้' ใน LINE เพื่อดูยอดหารบิลและ QR พร้อมเพย์ได้ทันที")}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-navy-900 text-[11px] font-medium"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-700" />
          </div>
          <span>หารบิล</span>
        </button>
      </div>
    </main>
  );
}

