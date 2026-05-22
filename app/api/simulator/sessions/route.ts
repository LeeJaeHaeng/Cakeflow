import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import type { Json } from "@/types/database";
import { isAllowedPublicStorageImageUrl } from "@/lib/security/images";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";

const MAX_SESSION_BODY_BYTES = 250 * 1024;
const MAX_JSON_DEPTH = 8;
const MAX_JSON_ARRAY_LENGTH = 80;
const MAX_JSON_OBJECT_KEYS = 120;
const MAX_JSON_STRING_LENGTH = 2000;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeJson(value: unknown, depth = 0): Json {
  if (depth > MAX_JSON_DEPTH) return null;
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return "[inline-image-omitted]";
    return value.slice(0, MAX_JSON_STRING_LENGTH);
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_JSON_ARRAY_LENGTH).map((entry) => sanitizeJson(entry, depth + 1));
  }
  if (!value || typeof value !== "object") return value as Json;

  const output: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).slice(0, MAX_JSON_OBJECT_KEYS).forEach(([key, entry]) => {
    output[key.slice(0, 80)] = sanitizeJson(entry, depth + 1);
  });
  return output as Json;
}

function cleanStorageImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  return isAllowedPublicStorageImageUrl(trimmed) ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const sessionLimit = checkRateLimit(`simulator-session:${getClientIp(request)}`, 60, 10 * 60 * 1000);
    if (!sessionLimit.allowed) return rateLimitResponse(sessionLimit.resetAt);

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_SESSION_BODY_BYTES) {
      return NextResponse.json({ error: "세션 데이터가 너무 큽니다." }, { status: 413 });
    }

    const body = await request.json();
    const { design_id, state_json, preview_url, production_url, summary, summary_json } = body;
    const previewUrl = cleanStorageImageUrl(preview_url);
    const productionUrl = cleanStorageImageUrl(production_url);

    const supabase = await createServiceClient();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("simulator_sessions")
      .insert({
        anonymous_token: nanoid(32),
        design_id: isUuid(design_id) ? design_id : null,
        state_json: sanitizeJson(state_json ?? {}),
        preview_url: previewUrl,
        production_url: productionUrl ?? previewUrl,
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
  const readLimit = checkRateLimit(`simulator-session-read:${getClientIp(request)}`, 120, 10 * 60 * 1000);
  if (!readLimit.allowed) return rateLimitResponse(readLimit.resetAt);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 필요" }, { status: 400 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: "id 형식이 올바르지 않습니다." }, { status: 400 });
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
