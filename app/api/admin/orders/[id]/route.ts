import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { sendSMS } from "@/lib/sms/aligo";

const STATUS_SMS: Record<string, string> = {
  confirmed: "[앙금앤케이크] 주문이 확정되었습니다. 픽업일에 방문해 주세요.",
  producing: "[앙금앤케이크] 케이크 제작을 시작했습니다.",
  ready: "[앙금앤케이크] 케이크 준비가 완료되었습니다! 오늘 방문해 주세요 🎂",
  cancelled: "[앙금앤케이크] 주문이 취소되었습니다. 문의: 031-000-0000",
};

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
    status?: "pending" | "confirmed" | "producing" | "ready" | "completed" | "cancelled" | "refunded";
    total_price?: number;
    deposit_amount?: number;
    payment_status?: "unpaid" | "partial" | "paid" | "refunded";
    admin_memo?: string;
    pickup_date?: string;
    pickup_time?: string;
  };

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, customers(name, phone)")
    .single();

  if (error || !data) return NextResponse.json({ error: "수정 실패" }, { status: 500 });

  // 상태 변경 시 SMS 발송
  if (body.status && STATUS_SMS[body.status]) {
    const customer = data.customers as { name: string; phone: string } | null;
    if (customer?.phone) {
      try {
        await sendSMS(customer.phone, STATUS_SMS[body.status]);
      } catch (e) {
        console.warn("[SMS 발송 실패]", e);
      }
    }
  }

  return NextResponse.json(data);
}
