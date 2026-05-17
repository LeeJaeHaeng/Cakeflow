import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { sendOperationalNotification } from "@/lib/notifications/aligo";
import { STATUS_TEMPLATE_KEYS, recordOrderStatusEvent, type ProductionOrderStatus } from "@/lib/orders/status";

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
    const { status, note } = parsed as { status: ProductionOrderStatus; note?: string };
    const supabase = await createServiceClient();

    const { data: before } = await (supabase as any)
      .from("orders")
      .select("*, customers(id, name, phone)")
      .eq("id", id)
      .single();

    if (!before) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });

    const { data: order, error } = await (supabase as any)
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, customers(id, name, phone)")
      .single();

    if (error || !order) return NextResponse.json({ error: "상태 변경 실패" }, { status: 500 });

    let notificationSent = false;
    const customer = order.customers as { id: string; name: string; phone: string } | null;
    const templateKey = STATUS_TEMPLATE_KEYS[status];
    if (templateKey && customer?.phone) {
      const result = await sendOperationalNotification(supabase, {
        orderId: id,
        customerId: customer.id,
        phone: customer.phone,
        name: customer.name,
        templateKey: templateKey as any,
        variables: {
          고객명: customer.name,
          주문번호: order.order_number,
          픽업일: order.pickup_date,
          픽업시간: order.pickup_time ?? "",
        },
      });
      notificationSent = result.ok;
    }

    await recordOrderStatusEvent(supabase, {
      orderId: id,
      actorType: "admin",
      actorId: session.email,
      previousStatus: before.status,
      nextStatus: status,
      previousPaymentStatus: before.payment_status,
      nextPaymentStatus: order.payment_status,
      note: note ?? null,
      notificationSent,
    });

    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL(`/admin/orders/${id}`, request.url), 303);
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error("[admin/orders/status]", err);
    return NextResponse.json({ error: "상태 변경 실패" }, { status: 500 });
  }
}
