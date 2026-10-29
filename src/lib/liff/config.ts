/**
 * LINE LIFF Configuration (ใช้ร่วมกันทั้งฝั่ง Client และ Server)
 *
 * NEXT_PUBLIC_LIFF_ID จะถูก inline ตอน build จึงอ่านได้ทั้ง Server Component
 * และ Client Component
 */

const rawLiffId = (process.env.NEXT_PUBLIC_LIFF_ID || "").trim();
const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();

/** LIFF ID จาก LINE Developers Console (เช่น 2012284598-NotCayv0) */
export const LIFF_ID = rawLiffId;

/** URL ของแอปที่ Deploy แล้ว (ใช้เป็น LIFF Endpoint URL) */
export const APP_URL = rawAppUrl.replace(/\/+$/, "");

/** true เมื่อตั้งค่า LIFF ID จริงแล้ว (ไม่ใช่ค่า placeholder) */
export const isLiffConfigured = Boolean(LIFF_ID) && !rawLiffId.includes("your_liff");

/**
 * ลิงก์สำหรับเปิดแอปผ่าน LINE (LIFF URL)
 * ใช้ในข้อความเชิญของ LINE Bot แทนการประกอบ URL เองในหลายจุด
 */
export const LIFF_ENTRY_URL = isLiffConfigured
  ? `https://liff.line.me/${LIFF_ID}`
  : "";
