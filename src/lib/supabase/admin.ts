import { createClient } from "@supabase/supabase-js";
import { ExtractedTransaction } from "../openai/parse-transaction";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Supabase Admin Client (Service Role)
 * ใช้สำหรับ Webhook Background Tasks ที่ไม่มี Session ของเบราว์เซอร์
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface UserGroupContext {
  userId: string;
  groupId: string;
  displayName: string;
  groupName: string;
}

/**
 * ค้นหา User ID และ Group ID เริ่มต้นของผู้ใช้จาก LINE User ID
 */
export async function getUserAndDefaultGroup(
  lineUserId: string
): Promise<UserGroupContext | null> {
  try {
    // 1. ค้นหาผู้ใช้จาก line_user_id ในตาราง users
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, display_name")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (userError || !user) {
      console.warn("⚠️ User not found for LINE ID:", lineUserId, userError);
      return null;
    }

    // 2. ค้นหากลุ่มที่ผู้ใช้นี้เป็นสมาชิกอยู่ (เลือกกลุ่มแรก หรือกลุ่มหลัก)
    const { data: member, error: memberError } = await supabaseAdmin
      .from("group_members")
      .select("group_id, groups(id, name)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError || !member || !member.groups) {
      console.warn("⚠️ Group membership not found for user ID:", user.id);
      return null;
    }

    // Extract group details
    const group = Array.isArray(member.groups) ? member.groups[0] : member.groups;

    return {
      userId: user.id,
      groupId: group.id,
      displayName: user.display_name,
      groupName: group.name,
    };
  } catch (error) {
    console.error("❌ Error in getUserAndDefaultGroup:", error);
    return null;
  }
}

/**
 * บันทึกธุรกรรมลงตาราง transactions ตาม Schema ใน Phase 1
 */
export async function saveTransactionToSupabase(params: {
  groupId: string;
  payerId: string;
  data: ExtractedTransaction;
}) {
  const { groupId, payerId, data } = params;

  // รวมชื่อรายการกับช่องทางชำระเงินในฟิลด์ description
  const descriptionWithAccount = data.account
    ? `${data.item} (${data.account})`
    : data.item;

  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      group_id: groupId,
      payer_id: payerId,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: descriptionWithAccount,
      transaction_date: data.date,
      is_split: false,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Failed to save transaction to Supabase:", error);
    throw error;
  }

  return transaction;
}

/**
 * ลบธุรกรรมออกจาก Supabase (กรณีผู้ใช้กดยกเลิกจาก Quick Reply)
 */
export async function deleteTransactionFromSupabase(transactionId: string) {
  const { error } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    console.error("❌ Failed to delete transaction from Supabase:", error);
    throw error;
  }
}


