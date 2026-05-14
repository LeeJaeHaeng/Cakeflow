import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const designId = searchParams.get("design_id");

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  let query = client
    .from("reviews")
    .select("id, rating, content, image_url, created_at, customers(name)")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (designId) query = query.eq("design_id", designId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json() as {
    order_id: string;
    customer_id: string;
    design_id?: string;
    rating: number;
    content?: string;
    image_url?: string;
  };

  if (!body.order_id || !body.customer_id || !body.rating) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }
  if (body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "별점은 1~5 사이여야 합니다" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: existing } = await client
    .from("reviews")
    .select("id")
    .eq("order_id", body.order_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "이미 리뷰를 작성했습니다" }, { status: 409 });

  const { data: order } = await supabase
    .from("orders")
    .select("status, customer_id")
    .eq("id", body.order_id)
    .single();
  if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  if (order.status !== "completed") return NextResponse.json({ error: "완료된 주문만 리뷰 가능합니다" }, { status: 400 });
  if (order.customer_id !== body.customer_id) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { data, error } = await client
    .from("reviews")
    .insert({
      order_id: body.order_id,
      customer_id: body.customer_id,
      design_id: body.design_id ?? null,
      rating: body.rating,
      content: body.content ?? null,
      image_url: body.image_url ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
