/**
 * ฟังก์ชันสำหรับดาวน์โหลดไฟล์ Binary (รูปภาพ) จาก LINE Data API เก็บลงใน Buffer ในหน่วยความจำ (RAM)
 * ไม่มีการเขียนลงดิสก์หรือบันทึกลง Cloud Storage
 */
export async function downloadLineImageAsBuffer(messageId: string): Promise<Buffer> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not defined in environment variables");
  }

  const endpoint = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download image from LINE API: ${response.status} ${response.statusText}`
    );
  }

  // แปลง Response stream เป็น ArrayBuffer แล้วแปลงเป็น Node.js Buffer
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

