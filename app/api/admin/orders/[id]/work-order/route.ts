import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select(`
      *,
      customers(name, phone, allergy, memo),
      order_items(*, cake_designs(title, thumbnail_url), dessert_products:dessert_id(title)),
      simulator_sessions(preview_url, production_url, summary, state_json)
    `)
    .eq("id", id)
    .single();

  if (error || !order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });

  const customer = order.customers;
  const simulator = order.simulator_sessions;
  const content = [
    "# CakeFlow 작업지시서",
    "",
    `주문번호: ${order.order_number}`,
    `고객명: ${customer?.name ?? "-"}`,
    `연락처: ${customer?.phone ?? "-"}`,
    `픽업: ${order.pickup_date} ${order.pickup_time ?? ""}`,
    `상태: ${order.status}`,
    `결제: ${order.payment_status} / ${Number(order.confirmed_price ?? order.total_price).toLocaleString("ko-KR")}원`,
    "",
    "## 고객 요청",
    order.customer_message ?? "-",
    "",
    "## 사장님 메모",
    order.admin_memo ?? "-",
    "",
    "## 알러지/특이사항",
    customer?.allergy ?? customer?.memo ?? "-",
    "",
    "## 시뮬레이터",
    `미리보기: ${simulator?.production_url ?? simulator?.preview_url ?? "-"}`,
    `요약: ${JSON.stringify(simulator?.summary ?? simulator?.state_json ?? {}, null, 2)}`,
  ].join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${order.order_number}-work-order.md\"`,
    },
  });
}
