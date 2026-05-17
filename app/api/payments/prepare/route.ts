import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { buildPaymentId } from "@/lib/orders/status";
import { getPublicPortOneConfig } from "@/lib/payments/portone";

export async function POST(request: Request) {
  try {
    const { order_id } = await request.json();
    if (!order_id) return NextResponse.json({ error: "order_id 필요" }, { status: 400 });

    const supabase = await createServiceClient();
    const { data: order, error } = await (supabase as any)
      .from("orders")
      .select("id, order_number, status, payment_status, total_price, confirmed_price, requires_consultation, quote_status")
      .eq("id", order_id)
      .single();

    if (error || !order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    if (order.requires_consultation) return NextResponse.json({ error: "상담 필요 주문은 온라인 결제를 진행할 수 없습니다." }, { status: 409 });
    if (order.payment_status === "paid") return NextResponse.json({ error: "이미 결제된 주문입니다." }, { status: 409 });

    const amount = Number(order.confirmed_price ?? order.total_price);
    const config = getPublicPortOneConfig();
    const paymentId = buildPaymentId(order.order_number);

    const { data: payment, error: paymentError } = await (supabase as any)
      .from("payments")
      .insert({
        order_id,
        amount,
        method: "CARD",
        payment_id: paymentId,
        channel_key: config.channelKey || null,
        status: "pending",
      })
      .select()
      .single();

    if (paymentError || !payment) throw paymentError;

    return NextResponse.json({
      payment_id: paymentId,
      store_id: config.storeId,
      channel_key: config.channelKey,
      order_name: `앙금앤케이크 주문 ${order.order_number}`,
      amount,
    });
  } catch (err) {
    console.error("[payments/prepare]", err);
    return NextResponse.json({ error: "결제 준비 중 오류가 발생했습니다." }, { status: 500 });
  }
}
