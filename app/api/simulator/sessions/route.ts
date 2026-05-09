import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { design_id, state_json, preview_url } = body;

    const supabase = await createServiceClient();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("simulator_sessions")
      .insert({
        anonymous_token: nanoid(32),
        design_id: design_id ?? null,
        state_json: state_json ?? {},
        preview_url: preview_url ?? null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[simulator/sessions POST]", err);
    return NextResponse.json({ error: "세션 저장 실패" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("simulator_sessions")
    .select("*")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(data);
}
