import { supabaseAdmin } from "./admin";
import { lineClient } from "../line/client";
import { createRecurringNotificationFlexMessage } from "../line/recurring-flex";
import { ExtractedRecurring } from "../openai/parse-recurring";

/**
 * คำนวณวันที่รอบถัดไปตามความถี่ (Frequency)
 */
export function calculateNextRunDate(
  currentDateStr: string,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  intervalCount: number = 1
): string {
  const date = new Date(currentDateStr);

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + intervalCount);
      break;

    case "weekly":
      date.setDate(date.getDate() + intervalCount * 7);
      break;

    case "monthly": {
      const currentDay = date.getDate();
      date.setMonth(date.getMonth() + intervalCount);
      // จัดการกรณีวันสิ้นเดือน (เช่น 31 ม.ค. -> 28 ก.พ.)
      if (date.getDate() !== currentDay) {
        date.setDate(0);
      }
      break;
    }

    case "yearly":
      date.setFullYear(date.getFullYear() + intervalCount);
      break;
  }

  return date.toISOString().split("T")[0];
}

/**
 * บันทึกรายการประจำลงตาราง recurring_transactions
 */
export async function createRecurringTransaction(params: {
  groupId: string;
  payerId: string;
  data: ExtractedRecurring;
}) {
  const { groupId, payerId, data } = params;

  const { data: recurring, error } = await supabaseAdmin
    .from("recurring_transactions")
    .insert({
      group_id: groupId,
      payer_id: payerId,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.item,
      frequency: data.frequency,
      interval_count: data.interval_count || 1,
      start_date: data.start_date,
      next_run_date: data.next_run_date,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Failed to create recurring transaction:", error);
    throw error;
  }

  return recurring;
}

/**
 * ดึงรายการประจำที่ถึงกำหนดจ่าย (Due Date)
 */
export async function getDueRecurringTransactions() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("recurring_transactions")
    .select(`
      id,
      group_id,
      payer_id,
      type,
      category,
      amount,
      description,
      frequency,
      interval_count,
      next_run_date,
      end_date,
      is_active,
      group:group_id (id, name),
      payer:payer_id (id, display_name, line_user_id)
    `)
    .eq("is_active", true)
    .lte("next_run_date", today);

  if (error) {
    console.error("❌ Failed to query due recurring items:", error);
    return [];
  }

  return data || [];
}

/**
 * ฟังก์ชันหลักสำหรับรัน Cron Job:
 * 1. ดึงรายการที่ถึงกำหนด
 * 2. บันทึกลงตาราง transactions อัตโนมัติ
 * 3. เลื่อน next_run_date ไปรอบถัดไป
 * 4. ส่ง Push Notification เตือนผู้ใช้ผ่าน LINE Messaging API
 */
export async function processDueRecurringTransactions() {
  const dueItems = await getDueRecurringTransactions();
  console.log(`⏰ [Cron Job] ตรวจพบรายการถึงกำหนดจ่าย ${dueItems.length} รายการ`);

  const results = {
    totalFound: dueItems.length,
    processedCount: 0,
    errors: [] as any[],
  };

  for (const item of dueItems as any[]) {
    try {
      // 1. บันทึกเป็น Transaction จริงในตาราง transactions
      const { data: newTx, error: txError } = await supabaseAdmin
        .from("transactions")
        .insert({
          group_id: item.group_id,
          payer_id: item.payer_id,
          type: item.type,
          category: item.category,
          amount: item.amount,
          description: `[บิลประจำ] ${item.description}`,
          transaction_date: item.next_run_date,
          is_split: false,
          recurring_id: item.id,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. คำนวณวันที่ในรอบถัดไป
      const nextDate = calculateNextRunDate(
        item.next_run_date,
        item.frequency,
        item.interval_count
      );

      // ตรวจสอบว่าเกินวันสิ้นสุด (end_date) หรือยัง
      const shouldDeactivate = item.end_date && nextDate > item.end_date;

      // 3. อัปเดต recurring_transactions
      const { error: updateError } = await supabaseAdmin
        .from("recurring_transactions")
        .update({
          next_run_date: nextDate,
          is_active: !shouldDeactivate,
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      // 4. ส่ง Push Notification ไปเตือนผู้ใช้ผ่าน LINE
      const lineUserId = item.payer?.line_user_id;
      if (lineUserId) {
        const groupName = item.group?.name || "ครอบครัว";
        const flexNotification = createRecurringNotificationFlexMessage({
          item: item.description,
          amount: Number(item.amount),
          frequency: item.frequency,
          nextRunDate: nextDate,
          groupName,
          transactionId: newTx.id,
        });

        await lineClient.pushMessage({
          to: lineUserId,
          messages: [flexNotification],
        });
        console.log(`📲 [LINE Push Sent] เตือนบิล ${item.description} ไปยังผู้ใช้ ${lineUserId}`);
      }

      results.processedCount++;
    } catch (err: any) {
      console.error(`❌ Error processing recurring item ${item.id}:`, err);
      results.errors.push({ id: item.id, error: err?.message });
    }
  }

  return results;
}

