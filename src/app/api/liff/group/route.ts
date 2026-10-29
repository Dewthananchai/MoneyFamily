import { NextRequest, NextResponse } from "next/server";

import { createFamilyGroup, ensureUser } from "@/lib/supabase/members";
import { errorResponse, NO_STORE, readIdentity } from "@/lib/liff/server-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/liff/group
 * body: { idToken, name }
 * สร้างครอบครัวใหม่และให้ผู้สร้างเป็นสมาชิก
 */
export async function POST(req: NextRequest) {
  try {
    const { body, identity } = await readIdentity(req);
    const user = await ensureUser(identity);
    const group = await createFamilyGroup({
      userId: user.id,
      name: String(body.name ?? ""),
    });

    return NextResponse.json({ group }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
