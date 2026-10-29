import { messagingApi } from "@line/bot-sdk";
import { GroupMemberProfile } from "../supabase/splits";

type FlexMessage = messagingApi.FlexMessage;
type FlexBubble = messagingApi.FlexBubble;

export interface SplitMemberState {
  userId: string;
  displayName: string;
  isSelected: boolean;
  percentage: number;
  amount: number;
}

/**
 * สร้าง LINE Flex Message สำหรับหน้าจอ "หารกับคนในบ้าน" (Split Bill Interactive Screen)
 * ประกอบด้วย:
 * 1. ปุ่มเลือกโหมด 50/50 (หารเท่ากัน) หรือโหมดเปอร์เซ็นต์
 * 2. รายชื่อสมาชิกในกลุ่มพร้อม Checkbox (☑️ / ⬜️)
 * 3. Slider จำลองสำหรับแสดงและปรับเปอร์เซ็นต์ (Visual Progress Slider Track + Step Buttons)
 * 4. ปุ่ม [💾 ยืนยันการหารบิล] สำหรับส่ง Postback ไปบันทึกลง Supabase
 */
export function createSplitBillFlexMessage(params: {
  transactionId: string;
  item: string;
  totalAmount: number;
  members: SplitMemberState[];
  isEqualMode?: boolean;
}): FlexMessage {
  const { transactionId, item, totalAmount, members, isEqualMode = true } = params;

  const formattedTotal = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalAmount);

  // สร้างแถวรายชื่อสมาชิกแต่ละคนพร้อม Checkbox และแถบ Slider
  const memberRows: messagingApi.FlexComponent[] = members.map((member, index) => {
    const checkIcon = member.isSelected ? "☑️" : "⬜️";
    const statusColor = member.isSelected ? "#0F172A" : "#94A3B8";
    const pct = Math.max(0, Math.min(100, Math.round(member.percentage)));

    return {
      type: "box",
      layout: "vertical",
      margin: "md",
      paddingAll: "12px",
      backgroundColor: member.isSelected ? "#F8FAFC" : "#FFFFFF",
      cornerRadius: "10px",
      borderWidth: "1px",
      borderColor: member.isSelected ? "#CBD5E1" : "#E2E8F0",
      contents: [
        // บรรทัดที่ 1: Checkbox + ชื่อสมาชิก + ยอดเงินที่ต้องจ่าย
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: `${checkIcon} ${member.displayName}`,
              color: statusColor,
              size: "sm",
              weight: "bold",
              flex: 6,
              action: {
                type: "postback",
                label: "Toggle",
                data: `action=toggle_member&txId=${transactionId}&userId=${member.userId}`,
                displayText: `สลับเลือก ${member.displayName}`,
              },
            },
            {
              type: "text",
              text: `฿${member.amount.toFixed(2)}`,
              color: member.isSelected ? "#059669" : "#94A3B8",
              size: "sm",
              weight: "bold",
              align: "end",
              flex: 4,
            },
          ],
        },

        // บรรทัดที่ 2: แถบ Slider จำลอง (Slider Visual Track)
        {
          type: "box",
          layout: "vertical",
          margin: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "สัดส่วนการหาร",
                  size: "xxs",
                  color: "#64748B",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${pct}%`,
                  size: "xs",
                  color: "#0284C7",
                  weight: "bold",
                  align: "end",
                  flex: 1,
                },
              ],
            },
            // Visual Slider Bar: ใช้ Nested Box ที่มี background ซ้อนกัน
            {
              type: "box",
              layout: "horizontal",
              height: "8px",
              backgroundColor: "#E2E8F0",
              cornerRadius: "4px",
              margin: "xs",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  width: `${pct}%`,
                  backgroundColor: member.isSelected ? "#0284C7" : "#CBD5E1",
                  cornerRadius: "4px",
                  contents: [],
                },
              ],
            },
          ],
        },

        // บรรทัดที่ 3: ปุ่มปรับ Slider (+ / -) ถ้าอยู่ในโหมดกำหนดเอง
        {
          type: "box",
          layout: "horizontal",
          margin: "xs",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "secondary",
              height: "sm",
              color: "#F1F5F9",
              action: {
                type: "postback",
                label: "➖ 10%",
                data: `action=adjust_pct&txId=${transactionId}&userId=${member.userId}&delta=-10`,
                displayText: `ลดส่วนแบ่ง ${member.displayName} ลง 10%`,
              },
            },
            {
              type: "button",
              style: "secondary",
              height: "sm",
              color: "#F1F5F9",
              action: {
                type: "postback",
                label: "➕ 10%",
                data: `action=adjust_pct&txId=${transactionId}&userId=${member.userId}&delta=10`,
                displayText: `เพิ่มส่วนแบ่ง ${member.displayName} ขึ้น 10%`,
              },
            },
          ],
        },
      ],
    };
  });

  // รวบรวมข้อมูลสำหรับส่งในปุ่มยืนยัน
  const splitsPayload = members
    .filter((m) => m.isSelected)
    .map((m) => ({
      u: m.userId,
      a: m.amount,
      p: m.percentage,
    }));

  const bubbleContents: FlexBubble = {
    type: "bubble",
    size: "giga",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0284C7", // Sky/Blue Theme สำหรับฟังก์ชันการหารบิล
      paddingAll: "18px",
      contents: [
        {
          type: "text",
          text: "👨‍👩‍👧‍👦 MoneyFamily • หารกับคนในบ้าน",
          color: "#E0F2FE",
          size: "xs",
          weight: "bold",
        },
        {
          type: "text",
          text: item,
          color: "#FFFFFF",
          size: "xl",
          weight: "bold",
          margin: "xs",
          wrap: true,
        },
        {
          type: "text",
          text: `ยอดรวมทั้งหมด ฿${formattedTotal}`,
          color: "#BAE6FD",
          size: "sm",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      contents: [
        // แถบสลับโหมด 50/50 (หารเท่ากัน)
        {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          contents: [
            {
              type: "button",
              style: isEqualMode ? "primary" : "secondary",
              color: isEqualMode ? "#0284C7" : "#F1F5F9",
              height: "sm",
              action: {
                type: "postback",
                label: "⚖️ โหมด 50/50 (หารเท่า)",
                data: `action=set_mode&mode=5050&txId=${transactionId}`,
                displayText: "สลับเป็นโหมดหารเท่ากัน 50/50",
              },
            },
          ],
        },
        {
          type: "separator",
          margin: "md",
        },
        {
          type: "text",
          text: "แตะชื่อสมาชิกเพื่อเลือก/ไม่เลือก และปรับสัดส่วน:",
          size: "xs",
          color: "#64748B",
          margin: "sm",
        },
        // รายชื่อสมาชิกพร้อมแถบ Slider
        ...memberRows,
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "16px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#059669", // Emerald Green บันทึกสำเร็จ
          height: "md",
          action: {
            type: "postback",
            label: "💾 ยืนยันบันทึกยอดหารบิล",
            data: `action=submit_split&txId=${transactionId}&splits=${encodeURIComponent(
              JSON.stringify(splitsPayload)
            )}`,
            displayText: "💾 ยืนยันการหารบิลนี้",
          },
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `👨‍👩‍👧‍👦 หารค่าใช้จ่าย ${item} ยอด ฿${formattedTotal}`,
    contents: bubbleContents,
  };
}

