import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    title?: string;
    category?: string | null;
    price?: number;
    cost?: number | null;
    stock_count?: number;
    thumbnail_url?: string | null;
    description?: string | null;
    status?: string;
  };

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("dessert_products")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("dessert_products")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
