import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from("shop_settings").select("*");
  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });

  const settings: Record<string, unknown> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((data ?? []) as any[]).forEach((row: { key: string; value: unknown }) => {
    settings[row.key] = row.value;
  });
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await request.json() as Record<string, unknown>;
  const supabase = await createServiceClient();

  const upserts = Object.entries(body).map(([key, value]) => ({
    key,
    value: value as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("shop_settings")
    .upsert(upserts, { onConflict: "key" });

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
