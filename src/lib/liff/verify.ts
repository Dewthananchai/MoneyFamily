import { LIFF_ID } from "./config";

/**
 * LIFF ID มีรูปแบบ <LINE Login channel ID>-<suffix>
 * ใช้ส่วนหน้าสำหรับยืนยัน ID token กับ LINE
 */
const LOGIN_CHANNEL_ID = LIFF_ID.split("-")[0] || "";

export interface LineIdentity {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
}

export class LineAuthError extends Error {}

interface VerifyResponse {
  sub?: string;
  name?: string;
  picture?: string;
  exp?: number;
}

/**
 * ยืนยัน LINE ID token ฝั่ง Server กับ LINE (ไม่ต้องใช้ channel secret)
 * เอกสาร: https://developers.line.biz/en/reference/line-login/#verify-id-token
 */
export async function verifyLineIdToken(idToken: string): Promise<LineIdentity> {
  if (!idToken) throw new LineAuthError("missing id_token");
  if (!LOGIN_CHANNEL_ID) throw new LineAuthError("LIFF channel is not configured");

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: LOGIN_CHANNEL_ID }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new LineAuthError(`LINE verify failed (${res.status}) ${detail.slice(0, 120)}`);
  }

  const data = (await res.json()) as VerifyResponse;
  if (!data.sub) throw new LineAuthError("LINE verify returned no subject");

  return {
    lineUserId: data.sub,
    displayName: data.name || "สมาชิกครอบครัว",
    pictureUrl: data.picture,
  };
}
