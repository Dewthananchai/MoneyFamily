import { NextRequest, NextResponse } from "next/server";
import {
  createRecurringTransaction,
  getDueRecurringTransactions,
} from "@/lib/supabase/recurring";
import { parseRecurringFromText } from "@/lib/openai/parse-recurring";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/recurring
 * บันทึกรายการประจำ เช่น "Netflix 419 ทุกเดือน"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, payerId, text, data } = body;

    if (!groupId || !payerId) {
      return NextResponse.json(
        { error: "Missing required fields: groupId, payerId" },
        { status: 400 }
      );
    }

    let recurringData = data;

    // ถ้าส่งข้อความภาษาไทยมา ให้แปลงด้วย AI ก่อน
    if (text && !recurringData) {
      recurringData = await parseRecurringFromText(text);
      if (!recurringData) {
        return NextResponse.json(
          { error: "Could not parse recurring text" },
          { status: 422 }
        );
      }
    }

    if (!recurringData || !recurringData.item || !recurringData.amount) {
      return NextResponse.json(
        { error: "Invalid recurring transaction data" },
        { status: 400 }
      );
    }

    const created = await createRecurringTransaction({
      groupId,
      payerId,
      data: recurringData,
    });

    return NextResponse.json({
      success: true,
      message: "สร้างรายการประจำสำเร็จ",
      data: created,
    });
  } catch (error: any) {
    console.error("❌ API Recurring Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recurring?groupId=xxx
 * ดึงรายการประจำทั้งหมดของกลุ่ม
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    let query = supabaseAdmin
      .from("recurring_transactions")
      .select(`
        *,
        payer:payer_id (id, display_name)
      `)
      .order("next_run_date", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

