import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "true";

  const supabase = await createServiceClient();
  let query = supabase
    .from("dessert_products")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!includeAll) query = query.neq("status", "deleted");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, category, price, cost, stock_count, thumbnail_url, description, status } = body;

    if (!title || price === undefined) {
      return NextResponse.json({ error: "제목과 가격은 필수입니다." }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("dessert_products")
      .insert({
        title,
        category: category ?? null,
        price: Number(price),
        cost: cost != null ? Number(cost) : null,
        stock_count: Number(stock_count ?? 0),
        thumbnail_url: thumbnail_url ?? null,
        description: description ?? null,
        status: status ?? "active",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[admin/products POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
