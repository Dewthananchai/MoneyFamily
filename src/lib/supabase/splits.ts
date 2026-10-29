import { supabaseAdmin } from "./admin";

export interface GroupMemberProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  lineUserId: string;
}

export interface SplitItem {
  userId: string;
  amount: number;
  percentage: number;
}

export interface DebtRelation {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  toPromptPay: string; // เบอร์โทรพร้อมเพย์ หรือ เบอร์ default สำหรับรับเงิน
  amount: number;
  transactionCount: number;
}

/**
 * ดึงรายชื่อสมาชิกทุกคนในกลุ่ม
 */
export async function getGroupMembersWithProfiles(
  groupId: string
): Promise<GroupMemberProfile[]> {
  const { data, error } = await supabaseAdmin
    .from("group_members")
    .select(`
      user_id,
      users:user_id (
        id,
        display_name,
        avatar_url,
        line_user_id
      )
    `)
    .eq("group_id", groupId);

  if (error || !data) {
    console.error("❌ Failed to fetch group members:", error);
    return [];
  }

  return data
    .map((item: any) => {
      const u = item.users;
      if (!u) return null;
      return {
        userId: u.id,
        displayName: u.display_name || "สมาชิก",
        avatarUrl: u.avatar_url,
        lineUserId: u.line_user_id,
      };
    })
    .filter(Boolean) as GroupMemberProfile[];
}

/**
 * บันทึกยอดหารบิลลงตาราง transaction_splits ใน Supabase
 */
export async function saveTransactionSplits(params: {
  transactionId: string;
  splits: SplitItem[];
}) {
  const { transactionId, splits } = params;

  // 1. อัปเดตตาราง transactions ให้ is_split = true
  const { error: txError } = await supabaseAdmin
    .from("transactions")
    .update({ is_split: true })
    .eq("id", transactionId);

  if (txError) {
    console.error("❌ Failed to update transaction.is_split:", txError);
    throw txError;
  }

  // 2. ลบ split เก่าของ transaction นี้ (ถ้ามี) เพื่อเขียนทับใหม่แบบ idempotent
  await supabaseAdmin
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);

  // 3. แทรกข้อมูลใหม่ลงตาราง transaction_splits
  const splitRows = splits.map((s) => ({
    transaction_id: transactionId,
    user_id: s.userId,
    split_amount: s.amount,
    split_percentage: s.percentage,
    is_settled: false,
  }));

  const { data, error: insertError } = await supabaseAdmin
    .from("transaction_splits")
    .insert(splitRows)
    .select();

  if (insertError) {
    console.error("❌ Failed to insert transaction_splits:", insertError);
    throw insertError;
  }

  return data;
}

/**
 * คำนวณสรุปหนี้สินในกลุ่ม: "ใครติดเงินใครเท่าไหร่" (พร้อมคำนวณ Netting หักลบกลบลบหนี้อัตโนมัติ)
 */
export async function getGroupDebtSummary(groupId: string): Promise<DebtRelation[]> {
  // ดึงรายการ split ทั้งหมดในกลุ่มที่ยังไม่เคลียร์ (is_settled = false)
  const { data, error } = await supabaseAdmin
    .from("transaction_splits")
    .select(`
      id,
      user_id,
      split_amount,
      is_settled,
      debtor:user_id (id, display_name),
      transactions:transaction_id!inner (
        id,
        group_id,
        payer_id,
        description,
        payer:payer_id (id, display_name)
      )
    `)
    .eq("is_settled", false)
    .eq("transactions.group_id", groupId);

  if (error || !data) {
    console.error("❌ Error fetching debt summary:", error);
    return [];
  }

  // Map เพื่อสะสมยอดหนี้: pairKey "fromId->toId"
  const rawDebts = new Map<string, {
    fromUserId: string;
    fromName: string;
    toUserId: string;
    toName: string;
    amount: number;
    count: number;
  }>();

  for (const row of data as any[]) {
    const tx = row.transactions;
    if (!tx) continue;

    const debtorId = row.user_id; // คนที่มีส่วนร่วมหารเงิน (ลูกหนี้)
    const creditorId = tx.payer_id; // คนที่ออกเงินไปก่อน (เจ้าหนี้)
    const debtorName = row.debtor?.display_name || "สมาชิก";
    const creditorName = tx.payer?.display_name || "ผู้จ่าย";
    const amount = Number(row.split_amount) || 0;

    // ถ้าคนที่หารคือคนที่จ่ายเอง ไม่ถือเป็นหนี้
    if (debtorId === creditorId || amount <= 0) {
      continue;
    }

    const key = `${debtorId}->${creditorId}`;
    if (!rawDebts.has(key)) {
      rawDebts.set(key, {
        fromUserId: debtorId,
        fromName: debtorName,
        toUserId: creditorId,
        toName: creditorName,
        amount: 0,
        count: 0,
      });
    }

    const item = rawDebts.get(key)!;
    item.amount += amount;
    item.count += 1;
  }

  // --------------------------------------------------------------------------
  // ทำ Netting (หักลบกลบลบหนี้):
  // ถ้า A ติด B 100 และ B ติด A 40 -> สรุปคือ A จ่าย B 60
  // --------------------------------------------------------------------------
  const userList = Array.from(
    new Set([
      ...Array.from(rawDebts.values()).map((d) => d.fromUserId),
      ...Array.from(rawDebts.values()).map((d) => d.toUserId),
    ])
  );

  const netBalance = new Map<string, number>(); // userId -> net balance (+ คือมีคนติดหนี้, - คือติดหนี้คนอื่น)
  for (const uid of userList) netBalance.set(uid, 0);

  const nameMap = new Map<string, string>();

  for (const debt of rawDebts.values()) {
    nameMap.set(debt.fromUserId, debt.fromName);
    nameMap.set(debt.toUserId, debt.toName);

    netBalance.set(debt.fromUserId, (netBalance.get(debt.fromUserId) || 0) - debt.amount);
    netBalance.set(debt.toUserId, (netBalance.get(debt.toUserId) || 0) + debt.amount);
  }

  // จัดการจับคู่ Netting หนี้ให้เหลือน้อยคู่ที่สุด
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [uid, balance] of netBalance.entries()) {
    if (balance < -0.01) {
      debtors.push({ id: uid, amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ id: uid, amount: balance });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const finalDebts: DebtRelation[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    if (settledAmount > 0.01) {
      finalDebts.push({
        fromUserId: debtor.id,
        fromName: nameMap.get(debtor.id) || "สมาชิก",
        toUserId: creditor.id,
        toName: nameMap.get(creditor.id) || "ผู้รับ",
        toPromptPay: "0812345678", // เบอร์ PromptPay ค่าเริ่มต้น (หรือดึงจากโปรไฟล์ผู้ใช้)
        amount: Math.round(settledAmount * 100) / 100,
        transactionCount: 1,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return finalDebts;
}

