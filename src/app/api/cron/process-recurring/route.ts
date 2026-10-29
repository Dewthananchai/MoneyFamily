import { NextRequest, NextResponse } from "next/server";
import { processDueRecurringTransactions } from "@/lib/supabase/recurring";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/process-recurring
 * Vercel Cron Job เรียกใช้วันละ 1 ครั้ง เพื่อตรวจเช็คบิลที่ถึงกำหนด และส่ง Push Notification แจ้งเตือน
 */
export async function GET(req: NextRequest) {
  try {
    // 1. ตรวจสอบความปลอดภัยด้วย CRON_SECRET (Vercel จะส่ง Authorization: Bearer <CRON_SECRET> มาให้)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("⚠️ Unauthorized access attempt to Cron Job");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("⏰ [Cron Job Started] กำลังประมวลผล Recurring Transactions...");

    // 2. รันฟังก์ชันตรวจเช็ค Due Date, สร้าง Transaction และส่ง LINE Push Notification
    const summary = await processDueRecurringTransactions();

    console.log("✅ [Cron Job Finished] ประมวลผลเสร็จสิ้น:", summary);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error("❌ Cron Job Fatal Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

