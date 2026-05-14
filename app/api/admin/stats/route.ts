import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = await createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [newOrders, todayPickups, activeOrders, weekOrders] = await Promise.all([
    // 신규 주문 (pending)
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    // 오늘 픽업
    supabase
      .from("orders")
      .select("id, order_number, pickup_time, status, customers(name), order_items(cake_designs(title))")
      .eq("pickup_date", today)
      .neq("status", "cancelled")
      .order("pickup_time", { ascending: true }),
    // 진행 중 (confirmed + producing + ready)
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["confirmed", "producing", "ready"]),
    // 이번 주 주문 (최근 7일)
    supabase
      .from("orders")
      .select("id, total_price, created_at, pickup_date")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .neq("status", "cancelled"),
  ]);

  // 요일별 매출 집계
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const weekMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    weekMap[key] = 0;
  }
  (weekOrders.data ?? []).forEach((o) => {
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    if (key in weekMap) weekMap[key] += o.total_price;
  });

  const weekData = Object.entries(weekMap).map(([date, amount]) => ({
    day: dayNames[new Date(date).getDay()],
    date,
    amount,
  }));

  const totalWeekRevenue = weekData.reduce((s, d) => s + d.amount, 0);

  return NextResponse.json({
    newOrderCount: newOrders.count ?? 0,
    activeOrderCount: activeOrders.count ?? 0,
    todayPickups: todayPickups.data ?? [],
    todayPickupCount: (todayPickups.data ?? []).length,
    weekData,
    totalWeekRevenue,
  });
}
