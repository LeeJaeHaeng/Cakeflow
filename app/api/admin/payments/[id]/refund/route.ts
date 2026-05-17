import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { cancelPortOnePayment } from "@/lib/payments/portone";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  try {
    const { id } = await params;
    const { reason = "관리자 환불", amount } = await request.json().catch(() => ({}));
    const supabase = await createServiceClient();

    const { data: payment, error } = await (supabase as any)
      .from("payments")
      .select("*, orders(id, status)")
      .eq("id", id)
      .single();

    if (error || !payment?.payment_id) return NextResponse.json({ error: "결제 정보를 찾을 수 없습니다." }, { status: 404 });

    const payload = await cancelPortOnePayment(payment.payment_id, reason, amount ? Number(amount) : undefined);

    await (supabase as any).from("payments").update({
      status: "refunded",
      raw_payload: payload,
    }).eq("id", id);

    await (supabase as any).from("orders").update({
      status: "refunded",
      payment_status: "refunded",
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    }).eq("id", payment.order_id);

    await (supabase as any).from("order_status_events").insert({
      order_id: payment.order_id,
      actor_type: "admin",
      actor_id: session.email,
      previous_status: payment.orders?.status ?? null,
      next_status: "refunded",
      next_payment_status: "refunded",
      note: reason,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/payments/refund]", err);
    return NextResponse.json({ error: "환불 처리 실패" }, { status: 500 });
  }
}
