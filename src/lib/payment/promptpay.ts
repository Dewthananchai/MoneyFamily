import QRCode from "qrcode";

// promptpay-qr เป็น CommonJS library
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatePayload = require("promptpay-qr");

/**
 * สร้าง PromptPay EMVCo Payload สำหรับสแกนจ่ายเงิน
 * @param target เบอร์โทรศัพท์ (เช่น 0812345678) หรือ เลขบัตรประชาชน 13 หลัก
 * @param amount ยอดเงินที่ต้องการให้โอน (ถ้าไม่ระบุ ผู้สแกนจะต้องกรอกยอดเอง)
 */
export function createPromptPayPayload(target: string, amount?: number): string {
  // ลบขีดหรือช่องว่างออกก่อนแปลง
  const cleanTarget = target.replace(/[^0-9]/g, "");
  return generatePayload(cleanTarget, { amount });
}

/**
 * สร้างรูปภาพ QR Code (PNG Buffer) จาก PromptPay Payload
 */
export async function createPromptPayQrBuffer(
  target: string,
  amount?: number
): Promise<Buffer> {
  const payload = createPromptPayPayload(target, amount);

  return await QRCode.toBuffer(payload, {
    type: "png",
    margin: 2,
    width: 450,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0F172A", // Dark Slate
      light: "#FFFFFF",
    },
  });
}

/**
 * สร้าง URL สำหรับแสดง QR Code ของระบบ (เรียกผ่าน API Route ของแอป)
 */
export function getPromptPayQrUrl(target: string, amount: number, baseUrl?: string): string {
  const host = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://moneyfamily.vercel.app";
  const cleanTarget = target.replace(/[^0-9]/g, "");
  return `${host}/api/qr/promptpay?target=${encodeURIComponent(cleanTarget)}&amount=${amount}`;
}

