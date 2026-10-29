import { NextRequest, NextResponse } from "next/server";
import { createPromptPayQrBuffer } from "@/lib/payment/promptpay";

export const dynamic = "force-dynamic";

/**
 * GET /api/qr/promptpay?target=0812345678&amount=150.00
 * คืนค่ารูปภาพ PNG QR Code สำหรับสแกนจ่ายเงินผ่าน PromptPay ทันที
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("target");
    const amountStr = searchParams.get("amount");

    if (!target) {
      return NextResponse.json(
        { error: "Missing required parameter: target (phone or national ID)" },
        { status: 400 }
      );
    }

    const amount = amountStr ? parseFloat(amountStr) : undefined;
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      return NextResponse.json(
        { error: "Invalid amount value" },
        { status: 400 }
      );
    }

    // สร้าง PNG QR Code Buffer
    const qrBuffer = await createPromptPayQrBuffer(target, amount);

    return new Response(qrBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("❌ Error generating PromptPay QR:", error);
    return NextResponse.json(
      { error: "Failed to generate QR Code" },
      { status: 500 }
    );
  }
}

