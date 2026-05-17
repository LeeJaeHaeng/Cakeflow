import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { sendOperationalNotification } from "@/lib/notifications/aligo";
import { STATUS_TEMPLATE_KEYS, recordOrderStatusEvent, type ProductionOrderStatus } from "@/lib/orders/status";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customers(id, name, phone, vip_flag, memo, allergy),
      order_items(*, cake_designs(title, thumbnail_url), dessert_products:dessert_id(title)),
      simulator_sessions(preview_url)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    status?: ProductionOrderStatus;
    total_price?: number;
    deposit_amount?: number;
    confirmed_price?: number;
    payment_status?: "unpaid" | "partial" | "paid" | "refunded";
    quote_status?: "not_required" | "pending_quote" | "quoted" | "accepted" | "expired";
    requires_consultation?: boolean;
    admin_memo?: string;
    pickup_date?: string;
    pickup_time?: string;
    cancel_reason?: string;
    internal_priority?: number;
  };

  const supabase = await createServiceClient();
  const { data: before } = await (supabase as any)
    .from("orders")
    .select("status, payment_status")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await (supabase as any)
    .from("orders")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, customers(id, name, phone)")
    .single();

  if (error || !data) return NextResponse.json({ error: "수정 실패" }, { status: 500 });

  let notificationSent = false;
  if (body.status) {
    const customer = data.customers as { id: string; name: string; phone: string } | null;
    const templateKey = STATUS_TEMPLATE_KEYS[body.status];
    if (templateKey && customer?.phone) {
      const result = await sendOperationalNotification(supabase, {
        orderId: data.id,
        customerId: customer.id,
        phone: customer.phone,
        name: customer.name,
        templateKey: templateKey as any,
        variables: {
          고객명: customer.name,
          주문번호: data.order_number,
          픽업일: data.pickup_date,
          픽업시간: data.pickup_time ?? "",
        },
      });
      notificationSent = result.ok;
    }

    await recordOrderStatusEvent(supabase, {
      orderId: data.id,
      actorType: "admin",
      actorId: session.email,
      previousStatus: before?.status ?? null,
      nextStatus: body.status,
      previousPaymentStatus: before?.payment_status ?? null,
      nextPaymentStatus: body.payment_status ?? data.payment_status,
      note: body.cancel_reason ?? null,
      notificationSent,
    });
  }

  return NextResponse.json(data);
}
