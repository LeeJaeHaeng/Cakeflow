import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();

  const [customerRes, ordersRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase
      .from("orders")
      .select("id, order_number, status, total_price, pickup_date, created_at, order_items(cake_designs(title))")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (customerRes.error || !customerRes.data) {
    return NextResponse.json({ error: "고객을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ customer: customerRes.data, orders: ordersRes.data ?? [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as { memo?: string; vip_flag?: boolean; allergy?: string };

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  return NextResponse.json(data);
}
