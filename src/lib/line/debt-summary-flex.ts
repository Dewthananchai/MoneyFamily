import { messagingApi } from "@line/bot-sdk";
import { DebtRelation } from "../supabase/splits";
import { getPromptPayQrUrl } from "../payment/promptpay";

type FlexMessage = messagingApi.FlexMessage;
type FlexBubble = messagingApi.FlexBubble;

/**
 * สร้าง Flex Message แสดงรายการ "สรุปหนี้ในครอบครัว"
 * พร้อมฝังรูปภาพ PromptPay QR Code เพื่อให้ผู้ใช้งานสแกนจ่ายคืนได้ทันที
 */
export function createDebtSummaryFlexMessage(params: {
  groupName: string;
  debts: DebtRelation[];
  baseUrl?: string;
}): FlexMessage {
  const { groupName, debts, baseUrl } = params;

  // กรณีไม่มีหนี้สินค้างจ่าย
  if (debts.length === 0) {
    return {
      type: "flex",
      altText: "🎉 ตอนนี้ทุกคนในบ้านเคลียร์หนี้หมดแล้วครับ!",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#10B981",
          paddingAll: "20px",
          contents: [
            {
              type: "text",
              text: "🎉 ยอดหนี้เป็นศูนย์!",
              color: "#FFFFFF",
              size: "lg",
              weight: "bold",
            },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "20px",
          contents: [
            {
              type: "text",
              text: `สมาชิกทุกคนในกลุ่ม "${groupName}" ได้เคลียร์ยอดค่าใช้จ่ายหมดเรียบร้อยแล้ว ไม่มีใครติดเงินใครครับ 👏`,
              wrap: true,
              color: "#374151",
            },
          ],
        },
      },
    };
  }

  // เลือกรายการแรกเป็นเป้าหมายหลักในการแสดง QR Code เพื่อสแกนจ่าย
  const primaryDebt = debts[0];
  const qrUrl = getPromptPayQrUrl(primaryDebt.toPromptPay, primaryDebt.amount, baseUrl);

  // สร้างแถวรายการหนี้สินทั้งหมด
  const debtListRows: messagingApi.FlexComponent[] = debts.map((d, index) => {
    const isPrimary = index === 0;
    return {
      type: "box",
      layout: "vertical",
      margin: "md",
      paddingAll: "12px",
      backgroundColor: isPrimary ? "#FEF3C7" : "#F8FAFC", // ไฮไลท์รายการแรก
      cornerRadius: "8px",
      borderWidth: isPrimary ? "1px" : "0px",
      borderColor: "#F59E0B",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: `${d.fromName} ➜ ${d.toName}`,
              color: "#1F2937",
              size: "sm",
              weight: "bold",
              flex: 6,
            },
            {
              type: "text",
              text: `฿${d.amount.toFixed(2)}`,
              color: "#DC2626", // ยอดหนี้สีแดง
              size: "sm",
              weight: "bold",
              align: "end",
              flex: 4,
            },
          ],
        },
      ],
    };
  });

  const bubbleContents: FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1E293B", // Dark Slate
      paddingAll: "18px",
      contents: [
        {
          type: "text",
          text: `MoneyFamily • ${groupName}`,
          color: "#94A3B8",
          size: "xs",
          weight: "bold",
        },
        {
          type: "text",
          text: "📊 สรุปยอดหนี้คงค้างในบ้าน",
          color: "#FFFFFF",
          size: "lg",
          weight: "bold",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "18px",
      contents: [
        {
          type: "text",
          text: "รายการที่ต้องโอนคืนกัน (คำนวณหักลบสุทธิแล้ว):",
          size: "xs",
          color: "#64748B",
          weight: "bold",
        },
        // รายการสรุปหนี้
        ...debtListRows,

        {
          type: "separator",
          margin: "lg",
        },

        // ส่วนแสดง QR Code พร้อมเพย์สำหรับการสแกนจ่าย
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          alignItems: "center",
          contents: [
            {
              type: "text",
              text: `สแกนจ่ายให้ "${primaryDebt.toName}"`,
              size: "sm",
              weight: "bold",
              color: "#0F172A",
              align: "center",
            },
            {
              type: "text",
              text: `ยอดที่ต้องโอน: ฿${primaryDebt.amount.toFixed(2)}`,
              size: "md",
              weight: "bold",
              color: "#059669",
              margin: "xs",
              align: "center",
            },
            // รูปภาพ QR Code จาก API Route /api/qr/promptpay
            {
              type: "image",
              url: qrUrl,
              size: "lg",
              aspectRatio: "1:1",
              aspectMode: "cover",
              margin: "md",
            },
            {
              type: "text",
              text: `พร้อมเพย์: ${primaryDebt.toPromptPay}`,
              size: "xs",
              color: "#64748B",
              margin: "xs",
              align: "center",
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        {
          type: "text",
          text: "💡 โอนเงินแล้วสามารถส่งสลิปเข้ามาเพื่อให้ระบบตรวจจับได้ทันที",
          color: "#94A3B8",
          size: "xxs",
          align: "center",
          wrap: true,
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `📊 สรุปหนี้ค้างจ่าย: ${primaryDebt.fromName} ติดเงิน ${primaryDebt.toName} ฿${primaryDebt.amount}`,
    contents: bubbleContents,
  };
}

