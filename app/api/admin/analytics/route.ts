import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "month"; // week | month | 3month | all

  const supabase = await createServiceClient();

  const now = new Date();
  let fromDate: string;
  if (period === "week") {
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === "month") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else if (period === "3month") {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
  } else {
    fromDate = "2000-01-01T00:00:00Z";
  }

  const [ordersRes, topDesignsRes, customerStatsRes, recentRes] = await Promise.all([
    // 전체 주문 집계
    supabase
      .from("orders")
      .select("id, status, total_price, created_at, pickup_date")
      .gte("created_at", fromDate)
      .neq("status", "cancelled")
      .neq("status", "refunded"),

    // 인기 디자인 (order_items 기준)
    supabase
      .from("order_items")
      .select("cake_design_id, cake_designs(title, thumbnail_url)")
      .not("cake_design_id", "is", null)
      .limit(100),

    // 신규 고객
    supabase
      .from("customers")
      .select("id, created_at")
      .gte("created_at", fromDate),

    // 최근 30일 일별 주문
    supabase
      .from("orders")
      .select("created_at, total_price, status")
      .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .neq("status", "cancelled"),
  ]);

  const orders = ordersRes.data ?? [];
  const recentOrders = recentRes.data ?? [];

  // 매출 합계
  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + (o.total_price ?? 0), 0);

  const completedCount = orders.filter((o) => o.status === "completed").length;
  const totalCount = orders.length;
  const avgOrderPrice = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

  // 상태별 분포
  const statusDist: Record<string, number> = {};
  orders.forEach((o) => {
    statusDist[o.status] = (statusDist[o.status] ?? 0) + 1;
  });

  // 일별 매출 (최근 30일)
  const dayMap: Record<string, { date: string; revenue: number; count: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = { date: key, revenue: 0, count: 0 };
  }
  recentOrders.forEach((o) => {
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    if (key in dayMap) {
      dayMap[key].revenue += o.total_price ?? 0;
      dayMap[key].count += 1;
    }
  });
  const dailyData = Object.values(dayMap);

  // 인기 디자인 집계
  const designCountMap: Record<string, { title: string; thumbnail_url: string | null; count: number }> = {};
  (topDesignsRes.data ?? []).forEach((item) => {
    const id = item.cake_design_id as string;
    const design = item.cake_designs as { title: string; thumbnail_url: string } | null;
    if (!id || !design) return;
    if (!designCountMap[id]) {
      designCountMap[id] = { title: design.title, thumbnail_url: design.thumbnail_url, count: 0 };
    }
    designCountMap[id].count += 1;
  });
  const topDesigns = Object.entries(designCountMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 요일별 주문 패턴 (0=일 ~ 6=토)
  const dayOfWeekMap: number[] = [0, 0, 0, 0, 0, 0, 0];
  orders.forEach((o) => {
    const dow = new Date(o.created_at).getDay();
    dayOfWeekMap[dow] += 1;
  });
  const dayOfWeekData = ["일", "월", "화", "수", "목", "금", "토"].map((day, i) => ({
    day,
    count: dayOfWeekMap[i],
  }));

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalCount,
      completedCount,
      avgOrderPrice,
      newCustomers: customerStatsRes.data?.length ?? 0,
    },
    statusDist,
    dailyData,
    topDesigns,
    dayOfWeekData,
  });
}
