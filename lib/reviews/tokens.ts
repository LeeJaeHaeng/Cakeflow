import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendOperationalNotification } from "@/lib/notifications/aligo";

const REVIEW_TOKEN_BYTES = 32;
const REVIEW_TOKEN_TTL_DAYS = 30;

type Supabase = SupabaseClient<Database>;

export type ReviewRequestOrder = {
  id: string;
  order_number: string;
  pickup_date?: string | null;
  pickup_time?: string | null;
  customer_id?: string | null;
  customers?: {
    id?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
};

type ReviewTokenResult = {
  token: string;
  expiresAt: string;
  reused: boolean;
};

function publicOrigin(requestUrl: string) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  const origin = configured?.trim() || new URL(requestUrl).origin;
  return origin.replace(/\/+$/, "");
}

export function buildReviewUrl(requestUrl: string, token: string) {
  const url = new URL("/orders/review", publicOrigin(requestUrl));
  url.searchParams.set("token", token);
  return url.toString();
}

export async function ensureReviewToken(
  supabase: Supabase,
  orderId: string,
  customerId: string
): Promise<ReviewTokenResult> {
  // review_tokens is newer than the generated Supabase type snapshot.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await client
    .from("review_tokens")
    .select("token, expires_at")
    .eq("order_id", orderId)
    .eq("customer_id", customerId)
    .is("used_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.token && existing?.expires_at) {
    return { token: existing.token, expiresAt: existing.expires_at, reused: true };
  }

  const expiresAt = new Date(Date.now() + REVIEW_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(REVIEW_TOKEN_BYTES).toString("base64url");
    const { data, error } = await client
      .from("review_tokens")
      .insert({
        order_id: orderId,
        customer_id: customerId,
        token,
        expires_at: expiresAt,
      })
      .select("token, expires_at")
      .single();

    if (!error && data?.token) {
      return { token: data.token, expiresAt: data.expires_at, reused: false };
    }
    if (error?.code !== "23505") throw error;
  }

  throw new Error("REVIEW_TOKEN_COLLISION");
}

export async function sendReviewRequestNotification(
  supabase: Supabase,
  requestUrl: string,
  order: ReviewRequestOrder
) {
  try {
    const customer = order.customers;
    const customerId = customer?.id ?? order.customer_id;
    if (!customerId || !customer?.phone) {
      return { ok: false, error: "REVIEW_REQUEST_MISSING_CUSTOMER" };
    }

    const reviewToken = await ensureReviewToken(supabase, order.id, customerId);
    const reviewUrl = buildReviewUrl(requestUrl, reviewToken.token);
    const result = await sendOperationalNotification(supabase, {
      orderId: order.id,
      customerId,
      phone: customer.phone,
      name: customer.name ?? undefined,
      templateKey: "review_request",
      variables: {
        고객명: customer.name ?? "",
        주문번호: order.order_number,
        픽업일: order.pickup_date ?? "",
        픽업시간: order.pickup_time ?? "",
        리뷰링크: reviewUrl,
      },
    });

    return {
      ...result,
      reviewUrl,
      expiresAt: reviewToken.expiresAt,
      reused: reviewToken.reused,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "REVIEW_REQUEST_FAILED";
    console.warn("[review request skipped]", err);
    return { ok: false, error };
  }
}
