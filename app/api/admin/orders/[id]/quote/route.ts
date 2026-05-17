import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { sendOperationalNotification } from "@/lib/notifications/aligo";
import { recordOrderStatusEvent } from "@/lib/orders/status";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
    const { confirmed_price, payment_status = "paid", admin_memo } = parsed as {
      confirmed_price: number;
      payment_status?: "unpaid" | "partial" | "paid";
      admin_memo?: string;
    };

    const confirmedPrice = Number(confirmed_price);
    if (!Number.isFinite(confirmedPrice) || confirmedPrice < 0) {
      return NextResponse.json({ error: "확정 금액을 입력해주세요." }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data: before } = await (supabase as any)
      .from("orders")
      .select("*, customers(id, name, phone)")
      .eq("id", id)
      .single();

    if (!before) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });

    const nextStatus = payment_status === "paid" ? "confirmed" : "pending";
    const { data: order, error } = await (supabase as any)
      .from("orders")
      .update({
        confirmed_price: confirmedPrice,
        total_price: confirmedPrice,
        deposit_amount: confirmedPrice,
        quote_status: payment_status === "paid" ? "accepted" : "quoted",
        payment_status,
        status: nextStatus,
        requires_consultation: payment_status !== "paid",
        admin_memo: admin_memo ?? before.admin_memo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, customers(id, name, phone)")
      .single();

    if (error || !order) return NextResponse.json({ error: "견적 확정 실패" }, { status: 500 });

    await recordOrderStatusEvent(supabase, {
      orderId: id,
      actorType: "admin",
      actorId: session.email,
      previousStatus: before.status,
      nextStatus,
      previousPaymentStatus: before.payment_status,
      nextPaymentStatus: payment_status,
      note: payment_status === "paid" ? "계좌이체 입금 확인 및 예약 확정" : "사장님 확정 견적 등록",
    });

    const customer = order.customers as { id: string; name: string; phone: string } | null;
    if (customer?.phone) {
      await sendOperationalNotification(supabase, {
        orderId: id,
        customerId: customer.id,
        phone: customer.phone,
        name: customer.name,
        templateKey: payment_status === "paid" ? "confirmed" : "quote_needed",
        variables: {
          고객명: customer.name,
          주문번호: order.order_number,
          픽업일: order.pickup_date,
          픽업시간: order.pickup_time ?? "",
          결제금액: confirmedPrice.toLocaleString("ko-KR"),
        },
      });
    }

    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL(`/admin/orders/${id}`, request.url), 303);
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error("[admin/orders/quote]", err);
    return NextResponse.json({ error: "견적 확정 실패" }, { status: 500 });
  }
}
