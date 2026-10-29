import { NextRequest, NextResponse } from "next/server";

import { ensureUser, joinFamilyGroup } from "@/lib/supabase/members";
import { errorResponse, NO_STORE, readIdentity } from "@/lib/liff/server-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/liff/join
 * body: { idToken, code }
 * เข้าร่วมครอบครัวด้วยรหัสเชิญ
 */
export async function POST(req: NextRequest) {
  try {
    const { body, identity } = await readIdentity(req);
    const user = await ensureUser(identity);
    const group = await joinFamilyGroup({
      userId: user.id,
      code: String(body.code ?? ""),
    });

    return NextResponse.json({ group }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
