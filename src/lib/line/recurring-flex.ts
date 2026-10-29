import { messagingApi } from "@line/bot-sdk";

type FlexMessage = messagingApi.FlexMessage;
type FlexBubble = messagingApi.FlexBubble;

const frequencyLabelMap: Record<string, string> = {
  daily: "ทุกวัน",
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
  yearly: "ทุกปี",
};

/**
 * สร้าง Flex Message แจ้งเตือนบิลประจำที่ถึงกำหนดจ่าย (Due Date Notification)
 */
export function createRecurringNotificationFlexMessage(params: {
  item: string;
  amount: number;
  frequency: string;
  nextRunDate: string;
  groupName: string;
  transactionId: string;
}): FlexMessage {
  const { item, amount, frequency, nextRunDate, groupName, transactionId } = params;

  const formattedAmount = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const freqText = frequencyLabelMap[frequency] || frequency;

  const bubbleContents: FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F2038", // กรมท่า Navy CI
      paddingAll: "18px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "🔔 แจ้งเตือนบิลประจำรอบ (Due Date)",
              color: "#FBBF24", // เหลืองทอง
              size: "xs",
              weight: "bold",
              flex: 1,
            },
            {
              type: "text",
              text: "AUTO-LOGGED",
              color: "#34D399",
              size: "xxs",
              weight: "bold",
              align: "end",
            },
          ],
        },
        {
          type: "text",
          text: item,
          color: "#FFFFFF",
          size: "xl",
          weight: "bold",
          margin: "sm",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      contents: [
        {
          type: "box",
          layout: "baseline",
          contents: [
            { type: "text", text: "฿", size: "xl", color: "#F59E0B", weight: "bold", flex: 0 },
            {
              type: "text",
              text: ` ${formattedAmount}`,
              size: "3xl",
              color: "#0F172A",
              weight: "bold",
              margin: "xs",
            },
          ],
        },
        { type: "separator", margin: "lg" },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "รอบการจ่าย", color: "#64748B", size: "sm", flex: 4 },
                { type: "text", text: freqText, color: "#0F172A", size: "sm", flex: 6, weight: "bold", align: "end" },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "กลุ่ม", color: "#64748B", size: "sm", flex: 4 },
                { type: "text", text: groupName, color: "#0F172A", size: "sm", flex: 6, align: "end" },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "รอบถัดไป", color: "#64748B", size: "sm", flex: 4 },
                { type: "text", text: nextRunDate, color: "#0284C7", size: "sm", flex: 6, weight: "bold", align: "end" },
              ],
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
          text: "รายการนี้ถูกบันทึกเข้าประวัติแล้ว ต้องการหารกับคนในบ้านหรือไม่? 👇",
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
    altText: `🔔 บิลประจำ ${item} ถึงกำหนดจ่าย ฿${formattedAmount}`,
    contents: bubbleContents,
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "✅ จ่ายแล้ว/รับทราบ",
            data: `action=acknowledged&txId=${transactionId}`,
            displayText: "✅ รับทราบการแจ้งเตือนบิลนี้",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "👨‍👩‍👧‍👦 หารกับคนในบ้าน",
            data: `action=open_split&txId=${transactionId}&amount=${amount}&item=${encodeURIComponent(item)}`,
            displayText: `👨‍👩‍👧‍👦 ขอหารบิล ${item} กับคนในบ้าน`,
          },
        },
      ],
    },
  };
}

