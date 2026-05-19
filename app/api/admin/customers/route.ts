import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

const EXCLUDED_TOTAL_STATUSES = new Set(["cancelled", "refunded"]);

type CustomerRow = {
  id: string;
  created_at: string;
  total_orders: number;
  total_amount: number;
  [key: string]: unknown;
};

type OrderStatsRow = {
  customer_id: string | null;
  status: string;
  total_price: number | null;
  confirmed_price?: number | null;
  created_at: string;
};

type RuntimeOrderListQuery = {
  select: (columns: string) => {
    in: (column: string, values: string[]) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

function normalizeSearch(value: string | null) {
  return (value ?? "").trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, " ");
}

function getOrderAmount(order: OrderStatsRow) {
  return Number(order.confirmed_price ?? order.total_price ?? 0);
}

function applyOrderStats(customers: CustomerRow[], orders: OrderStatsRow[]) {
  const stats = new Map<string, { total_orders: number; total_amount: number; last_order_at: string | null }>();

  for (const order of orders) {
    if (!order.customer_id || EXCLUDED_TOTAL_STATUSES.has(order.status)) continue;
    const current = stats.get(order.customer_id) ?? { total_orders: 0, total_amount: 0, last_order_at: null };
    current.total_orders += 1;
    current.total_amount += getOrderAmount(order);
    if (!current.last_order_at || String(order.created_at).localeCompare(current.last_order_at) > 0) {
      current.last_order_at = order.created_at;
    }
    stats.set(order.customer_id, current);
  }

  return customers.map((customer) => ({
    ...customer,
    total_orders: stats.get(customer.id)?.total_orders ?? 0,
    total_amount: stats.get(customer.id)?.total_amount ?? 0,
    last_order_at: stats.get(customer.id)?.last_order_at ?? null,
  }));
}

export async function GET(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = normalizeSearch(searchParams.get("search"));
  const phoneSearch = normalizePhone(search);
  const vipOnly = searchParams.get("vip") === "true";

  const supabase = await createServiceClient();

  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (vipOnly) query = query.eq("vip_flag", true);
  if (search) {
    const terms = [`name.ilike.%${escapeIlike(search)}%`, `phone.ilike.%${escapeIlike(search)}%`];
    if (phoneSearch && phoneSearch !== search) terms.push(`phone.ilike.%${phoneSearch}%`);
    query = query.or(terms.join(","));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const customers = (data ?? []) as CustomerRow[];
  if (customers.length === 0) return NextResponse.json({ customers: [] });

  const customerIds = customers.map((customer) => customer.id);
  const orderQuery = supabase.from("orders") as unknown as RuntimeOrderListQuery;
  const { data: orders, error: ordersError } = await orderQuery
    .select("customer_id, status, total_price, confirmed_price, created_at")
    .in("customer_id", customerIds);

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  const enriched = applyOrderStats(customers, (orders ?? []) as OrderStatsRow[])
    .sort((a, b) => {
      if (b.total_orders !== a.total_orders) return b.total_orders - a.total_orders;
      if (b.total_amount !== a.total_amount) return b.total_amount - a.total_amount;
      return String(b.last_order_at ?? b.created_at).localeCompare(String(a.last_order_at ?? a.created_at));
    })
    .slice(0, 200);

  return NextResponse.json({ customers: enriched });
}
