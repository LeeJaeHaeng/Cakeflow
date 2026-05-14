import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date"); // yyyy-MM-dd
  const search = searchParams.get("search");
  const limit = Number(searchParams.get("limit") ?? 100);

  const supabase = await createServiceClient();

  let query = supabase
    .from("orders")
    .select(`
      *,
      customers(id, name, phone, vip_flag, memo),
      order_items(*, cake_designs(title, thumbnail_url), dessert_products:dessert_id(title))
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status as "pending" | "confirmed" | "producing" | "ready" | "completed" | "cancelled" | "refunded");
  if (date) query = query.eq("pickup_date", date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 검색 필터 (이름·전화번호·주문번호)
  let items = data ?? [];
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((o) => {
      const c = o.customers as { name: string; phone: string } | null;
      return (
        o.order_number.toLowerCase().includes(q) ||
        (c?.name ?? "").includes(q) ||
        (c?.phone ?? "").includes(q)
      );
    });
  }

  return NextResponse.json({ orders: items });
}
