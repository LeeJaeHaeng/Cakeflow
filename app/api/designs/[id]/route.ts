import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import type { DesignCategory } from "@/types/database";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();
  const session = await verifyAdminSession();

  let query = supabase
    .from("cake_designs")
    .select("*, design_images(*)")
    .eq("id", id)
    .is("deleted_at", null);

  if (!session) {
    query = query.eq("display_status", "visible");
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: "디자인을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json() as {
      title?: string;
      description?: string | null;
      categories?: DesignCategory[];
      style_tags?: string[];
      color_tags?: string[];
      price_from?: number;
      thumbnail_url?: string;
      simulator_enabled?: boolean;
      display_status?: string;
      deleted_at?: string | null;
    };
    const updatePayload = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.categories !== undefined ? { categories: body.categories } : {}),
      ...(body.style_tags !== undefined ? { style_tags: body.style_tags } : {}),
      ...(body.color_tags !== undefined ? { color_tags: body.color_tags } : {}),
      ...(body.price_from !== undefined ? { price_from: Number(body.price_from) } : {}),
      ...(body.thumbnail_url !== undefined ? { thumbnail_url: body.thumbnail_url } : {}),
      ...(body.simulator_enabled !== undefined ? { simulator_enabled: body.simulator_enabled } : {}),
      ...(body.display_status !== undefined ? { display_status: body.display_status } : {}),
      ...(body.deleted_at !== undefined ? { deleted_at: body.deleted_at } : {}),
      updated_at: new Date().toISOString(),
    };

    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("cake_designs")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[designs PATCH]", err);
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("cake_designs")
    .update({ deleted_at: new Date().toISOString(), display_status: "hidden" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
