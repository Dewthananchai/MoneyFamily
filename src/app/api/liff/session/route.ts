import { NextRequest, NextResponse } from "next/server";

import { ensureUser, getMembership } from "@/lib/supabase/members";
import { errorResponse, NO_STORE, readIdentity } from "@/lib/liff/server-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/liff/session
 * body: { idToken }
 * คืนข้อมูลผู้ใช้ + ครอบครัวที่สังกัด (null = ยังไม่ลงทะเบียน)
 */
export async function POST(req: NextRequest) {
  try {
    const { identity } = await readIdentity(req);
    const user = await ensureUser(identity);
    const group = await getMembership(user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          displayName: user.displayName,
          pictureUrl: user.avatarUrl,
        },
        group,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
