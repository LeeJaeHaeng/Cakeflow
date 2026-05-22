import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAllowedPublicStorageImageUrl } from "@/lib/security/images";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";

/* eslint-disable @typescript-eslint/no-explicit-any */

type OrderItem = {
  cake_design_id?: string | null;
  cake_designs?: { id?: string | null; title?: string | null } | { id?: string | null; title?: string | null }[] | null;
  dessert_products?: { title?: string | null } | { title?: string | null }[] | null;
};

function relationObject<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function orderItems(order: any): OrderItem[] {
  return Array.isArray(order?.order_items) ? order.order_items : [];
}

function primaryCakeDesignId(order: any) {
  const item = orderItems(order).find((entry) => entry.cake_design_id || relationObject(entry.cake_designs)?.id);
  return item?.cake_design_id ?? relationObject(item?.cake_designs)?.id ?? null;
}

function primaryItemTitle(order: any) {
  const item = orderItems(order)[0];
  if (!item) return "주문 상품";
  return relationObject(item.cake_designs)?.title ?? relationObject(item.dessert_products)?.title ?? "주문 상품";
}

async function loadReviewTokenInfo(request: Request, token: string, client: any) {
  const rateLimit = checkRateLimit(`reviews:token:${getClientIp(request)}`, 60, 10 * 60 * 1000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

  if (token.length < 24 || token.length > 160) {
    return NextResponse.json({ error: "리뷰 링크 형식이 올바르지 않습니다" }, { status: 400 });
  }

  const { data: tokenRow, error: tokenError } = await client
    .from("review_tokens")
    .select("id, order_id, customer_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenError) return NextResponse.json({ error: "리뷰 권한 확인에 실패했습니다" }, { status: 503 });
  if (!tokenRow) return NextResponse.json({ error: "리뷰 링크를 찾을 수 없습니다" }, { status: 404 });

  const { data: order, error: orderError } = await client
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      customer_id,
      order_items(cake_design_id, dessert_id, cake_designs(id, title), dessert_products:dessert_id(id, title))
    `)
    .eq("id", tokenRow.order_id)
    .maybeSingle();

  if (orderError) return NextResponse.json({ error: "주문 확인에 실패했습니다" }, { status: 503 });
  if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  if (order.customer_id !== tokenRow.customer_id) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { data: existingReview } = await client
    .from("reviews")
    .select("id")
    .eq("order_id", tokenRow.order_id)
    .maybeSingle();

  const response = {
    order: {
      id: order.id,
      order_number: order.order_number,
      item_title: primaryItemTitle(order),
      design_id: primaryCakeDesignId(order),
    },
    expires_at: tokenRow.expires_at,
    already_reviewed: Boolean(existingReview),
  };

  if (existingReview) return NextResponse.json(response);
  if (tokenRow.used_at) return NextResponse.json({ error: "이미 사용된 리뷰 링크입니다" }, { status: 409 });
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "리뷰 링크가 만료되었습니다" }, { status: 410 });
  }
  if (order.status !== "completed") {
    return NextResponse.json({ error: "픽업 완료 후 리뷰를 작성할 수 있습니다" }, { status: 400 });
  }

  return NextResponse.json(response);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  const designId = searchParams.get("design_id");

  const supabase = await createServiceClient();
  const client = supabase as any;

  if (searchParams.has("token")) {
    return loadReviewTokenInfo(request, token ?? "", client);
  }

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
  const rateLimit = checkRateLimit(`reviews:post:${getClientIp(request)}`, 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

  const body = await request.json() as {
    order_id: string;
    rating: number;
    content?: string;
    image_url?: string;
    review_token?: string;
  };

  const rating = Number(body.rating);
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!body.order_id || !body.review_token || !rating) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "별점은 1~5 사이여야 합니다" }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: "리뷰 내용은 1000자 이내로 입력해주세요" }, { status: 400 });
  }
  if (body.image_url && !isAllowedPublicStorageImageUrl(body.image_url)) {
    return NextResponse.json({ error: "리뷰 이미지 URL이 허용되지 않았습니다" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const client = supabase as any;

  const { data: tokenRow, error: tokenError } = await client
    .from("review_tokens")
    .select("id, order_id, customer_id, used_at, expires_at")
    .eq("token", body.review_token)
    .maybeSingle();
  if (tokenError) return NextResponse.json({ error: "리뷰 권한 확인에 실패했습니다" }, { status: 503 });
  if (!tokenRow || tokenRow.order_id !== body.order_id) {
    return NextResponse.json({ error: "리뷰 작성 권한이 없습니다" }, { status: 403 });
  }
  if (tokenRow.used_at) {
    return NextResponse.json({ error: "이미 사용된 리뷰 링크입니다" }, { status: 409 });
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "리뷰 링크가 만료되었습니다" }, { status: 410 });
  }

  const { data: existing } = await client
    .from("reviews")
    .select("id")
    .eq("order_id", body.order_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "이미 리뷰를 작성했습니다" }, { status: 409 });

  const { data: order } = await client
    .from("orders")
    .select("status, customer_id, order_items(cake_design_id)")
    .eq("id", body.order_id)
    .single();
  if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  if (order.status !== "completed") return NextResponse.json({ error: "완료된 주문만 리뷰 가능합니다" }, { status: 400 });
  if (order.customer_id !== tokenRow.customer_id) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { data, error } = await client
    .from("reviews")
    .insert({
      order_id: body.order_id,
      customer_id: tokenRow.customer_id,
      design_id: primaryCakeDesignId(order),
      rating,
      content: content || null,
      image_url: body.image_url ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await client.from("review_tokens").update({ used_at: new Date().toISOString() }).eq("id", tokenRow.id);
  return NextResponse.json(data, { status: 201 });
}
