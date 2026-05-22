import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { formatKoreanPhone } from "@/lib/phone";

const EXCLUDED_TOTAL_STATUSES = new Set(["cancelled", "refunded"]);

type CustomerRow = {
  id: string;
  created_at: string;
  total_orders: number;
  total_amount: number;
  [key: string]: unknown;
};

type OrderSummaryRow = {
  id: string;
  order_number: string;
  status: string;
  total_price: number | null;
  confirmed_price?: number | null;
  pickup_date: string;
  created_at: string;
  [key: string]: unknown;
};

type RuntimeOrderDetailQuery = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      order: (column: string, options: { ascending: boolean }) => {
        limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

function getOrderAmount(order: OrderSummaryRow) {
  return Number(order.confirmed_price ?? order.total_price ?? 0);
}

function applyOrderStats(customer: CustomerRow, orders: OrderSummaryRow[]) {
  const activeOrders = orders.filter((order) => !EXCLUDED_TOTAL_STATUSES.has(order.status));
  const totalAmount = activeOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
  return {
    ...customer,
    phone: formatKoreanPhone(customer.phone),
    total_orders: activeOrders.length,
    total_amount: totalAmount,
    last_order_at: orders[0]?.created_at ?? null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();
  const orderQuery = supabase.from("orders") as unknown as RuntimeOrderDetailQuery;

  const [customerRes, ordersRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    orderQuery
      .select("id, order_number, status, total_price, confirmed_price, pickup_date, created_at, order_items(cake_designs(title), dessert_products:dessert_id(title))")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (customerRes.error || !customerRes.data) {
    return NextResponse.json({ error: "고객을 찾을 수 없습니다." }, { status: 404 });
  }

  const orders = (ordersRes.data ?? []) as OrderSummaryRow[];
  return NextResponse.json({ customer: applyOrderStats(customerRes.data as CustomerRow, orders), orders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as { memo?: string; vip_flag?: boolean; allergy?: string };
  const updatePayload = {
    ...(body.memo !== undefined ? { memo: body.memo } : {}),
    ...(body.vip_flag !== undefined ? { vip_flag: body.vip_flag } : {}),
    ...(body.allergy !== undefined ? { allergy: body.allergy } : {}),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  return NextResponse.json(data);
}
