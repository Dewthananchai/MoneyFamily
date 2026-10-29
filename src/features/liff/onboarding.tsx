"use client";

import React, { useState } from "react";
import { ArrowRight, KeyRound, Loader2, Plus, Users } from "lucide-react";

export interface OnboardingGroup {
  id: string;
  name: string;
  inviteCode: string;
  role: string | null;
}

interface OnboardingProps {
  idToken: string;
  displayName: string;
  onReady: (group: OnboardingGroup) => void;
}

type Mode = "create" | "join";

export function LiffOnboarding({ idToken, displayName, onReady }: OnboardingProps) {
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState(`ครอบครัว ${displayName.split(" ")[0]}`);
  const [code, setCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch(mode === "create" ? "/api/liff/group" : "/api/liff/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "create"
            ? { idToken, name: name.trim() }
            : { idToken, code: code.trim().toUpperCase() }
        ),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "ทำรายการไม่สำเร็จ");
      }

      onReady(data.group as OnboardingGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-amber to-brand-yellow text-navy-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            M
          </div>
          <h1 className="mt-3 text-xl font-black text-navy-900">ยินดีต้อนรับสู่ MoneyFamily</h1>
          <p className="text-xs text-slate-600 mt-1">
            สวัสดีครับ {displayName} 👋 เริ่มต้นด้วยการสร้างครอบครัวหรือเข้าร่วมครอบครัวที่มีอยู่
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-colors ${
                mode === "create"
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-slate-500 hover:text-navy-900"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              สร้างครอบครัว
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("join");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-colors ${
                mode === "join"
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-slate-500 hover:text-navy-900"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              เข้าร่วมด้วยรหัส
            </button>
          </div>

          <form onSubmit={submit} className="p-4 space-y-3">
            {mode === "create" ? (
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">ชื่อครอบครัว</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                  placeholder="เช่น ครอบครัวใจดี"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-brand-amber focus:ring-2 focus:ring-amber-100"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  คุณจะเป็นสมาชิกคนแรก และได้รหัสเชิญไว้ให้สมาชิกคนอื่นเข้าร่วม
                </span>
              </label>
            ) : (
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">รหัสเชิญ 6 หลัก</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  required
                  placeholder="เช่น 7KQ2MB"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center text-lg font-black tracking-[0.3em] text-navy-900 uppercase outline-none focus:border-brand-amber focus:ring-2 focus:ring-amber-100"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  ขอรหัสได้จากสมาชิกในครอบครัว (แสดงในหน้า Dashboard)
                </span>
              </label>
            )}

            {error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving || (mode === "join" && code.trim().length < 4)}
              className="w-full flex items-center justify-center gap-1.5 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก…
                </>
              ) : (
                <>
                  {mode === "create" ? "สร้างครอบครัว" : "เข้าร่วมครอบครัว"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <Users className="w-3 h-3" />
          สมาชิกในครอบครัวเห็นรายการเดียวกัน พิมพ์บอกบอทใน LINE ได้ทันที
        </p>
      </div>
    </main>
  );
}
