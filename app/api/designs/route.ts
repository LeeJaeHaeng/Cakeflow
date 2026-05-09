import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeHidden = searchParams.get("all") === "true";

  const supabase = await createServiceClient();

  let query = supabase
    .from("cake_designs")
    .select("*, design_images(*)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!includeHidden) {
    query = query.eq("display_status", "visible");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, categories, style_tags, color_tags, price_from, thumbnail_url, simulator_enabled, display_status } = body;

    if (!title || !price_from || !thumbnail_url) {
      return NextResponse.json(
        { error: "제목, 가격, 대표 이미지는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("cake_designs")
      .insert({
        title,
        description: description ?? null,
        categories: categories ?? [],
        style_tags: style_tags ?? [],
        color_tags: color_tags ?? [],
        price_from: Number(price_from),
        thumbnail_url,
        simulator_enabled: simulator_enabled ?? true,
        display_status: display_status ?? "visible",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[designs POST]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
