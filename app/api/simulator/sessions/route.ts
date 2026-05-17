import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import type { Json } from "@/types/database";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeJson(value: unknown): Json {
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (!value || typeof value !== "object") return value as Json;

  const output: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (typeof entry === "string" && entry.startsWith("data:image/")) {
      output[key] = "[inline-image-omitted]";
      return;
    }
    output[key] = sanitizeJson(entry);
  });
  return output as Json;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { design_id, state_json, preview_url, production_url, summary, summary_json } = body;

    const supabase = await createServiceClient();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("simulator_sessions")
      .insert({
        anonymous_token: nanoid(32),
        design_id: isUuid(design_id) ? design_id : null,
        state_json: sanitizeJson(state_json ?? {}),
        preview_url: preview_url ?? null,
        production_url: production_url ?? preview_url ?? null,
        summary: sanitizeJson(summary ?? summary_json ?? null),
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
