import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import { PRODUCT_OPTIONS, calculatePrice, formatWon, getProduct, normalizeProductOptions, type CakeOrderDetails, type ProductKey } from "@/lib/orders/pricing";
import { sendOperationalNotification } from "@/lib/notifications/aligo";
import { getCapacityErrorMessage } from "@/lib/orders/capacity";
import { getInitialQuoteStatus, recordOrderStatusEvent } from "@/lib/orders/status";
import { verifyCustomerSession } from "@/lib/auth/customer";
import { formatKoreanPhone, normalizeKoreanMobile, phoneDigits } from "@/lib/phone";
import { PHONE_AUTH_DISABLED } from "@/lib/phone-auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const createLimit = checkRateLimit(`orders:create:${getClientIp(request)}`, 10, 10 * 60 * 1000);
    if (!createLimit.allowed) return rateLimitResponse(createLimit.resetAt);

    let activeProducts = normalizeProductOptions(PRODUCT_OPTIONS);
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_token,
      pickup_date,
      pickup_time,
      customer_message,
      allergy,
      cake_details,
      design_id,
      simulator_session_id,
      order_type = "cake",
      delivery_method = "pickup",
      source_channel = "web",
    } = body;

    if (!customer_name || !customer_phone || !pickup_date) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(pickup_date))) {
      return NextResponse.json({ error: "픽업일 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const todayKst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    if (String(pickup_date) < todayKst) {
      return NextResponse.json({ error: "지난 날짜로는 주문할 수 없습니다." }, { status: 400 });
    }

    const isMissingColumnError = (error: unknown) => {
      if (!error || typeof error !== "object") return false;
      const err = error as { code?: string; message?: string };
      return err.code === "PGRST204" || Boolean(err.message?.includes("schema cache"));
    };

    const formatCakeDetails = (details: Record<string, unknown> | null | undefined) => {
      if (!details || typeof details !== "object") return "";
      const quote = calculatePrice(details as CakeOrderDetails, activeProducts);
      const product = getProduct((details as CakeOrderDetails).product_key, activeProducts);
      const paymentMethod = "계좌이체";

      const rows: Array<[string, unknown]> = [
        ["상품", product.title],
        ["사이즈", details.size],
        ["빵맛", details.sheet_flavor],
        ["떡 종류", details.rice_base],
        ["숫자 개수", details.product_key === "number_rice" ? `${details.number_count ?? 2}개` : ""],
        ["컵케이크 수량", details.product_key === "rice_cupcake" ? `${details.number_count ?? 2}개` : ""],
        ["앙금플라워 스타일", details.product_key === "rice_flower" ? details.rice_flower_style === "dome" ? "돔 스타일" : details.rice_flower_style === "crescent" ? "크레센트 스타일" : details.rice_flower_style === "wreath_basic" ? "기본 리스" : details.rice_flower_style === "wreath" ? "가득메운 리스" : details.rice_flower_style === "blossom" ? "블라썸 스타일" : "" : ""],
        ["필링", Array.isArray(details.filling) ? details.filling.join(", ") : ""],
        ["디자인 설명", details.design_style],
        ["색감", details.desired_color],
        ["문구", details.phrase],
        ["문구 추가", details.lettering ? "희망" : ""],
        ["피규어 요청", details.figure_request],
        ["초 추가", details.candle ? "희망" : ""],
        ["참고사진/설명", details.reference_note],
        ["참고사진 URL", details.reference_image_url],
        ["알레르기", details.allergy],
        ["기타 요청", details.extra_request],
        ["기본금액", formatWon(quote.basePrice)],
        ["확정 추가금", quote.addOns.length > 0 ? quote.addOns.map((item) => `${item.label} +${formatWon(item.amount)}`).join(", ") : ""],
        ["상담 필요 추가금", quote.unknownItems.join(", ")],
        ["예상 주문금액", `${formatWon(quote.total)}${quote.exact ? "" : " + 상담 후 추가금"}`],
        ["결제 방식", paymentMethod],
        ["예약 안내", "사장님 확인 후 카카오톡/전화 상담 및 계좌이체 입금으로 예약 확정"],
      ];

      return rows
        .filter(([, value]) => Boolean(value))
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n");
    };

    const formatSimulatorDetails = (state: unknown) => {
      if (!state || typeof state !== "object") return "";
      const snapshot = state as {
        cakeType?: string;
        productKey?: ProductKey | null;
        cakeSize?: string;
        layoutPreset?: string | null;
        referenceImageMode?: string;
        lettering?: Array<{ text?: string; mode?: string; placement?: string; fontSize?: number }>;
      };
      const presetLabels: Record<string, string> = { crescent: "크레센트", wreath: "리스", half: "반달", dome: "돔형", free: "프리스타일" };
      const placementLabels: Record<string, string> = { center: "중앙", bottom: "하단", edge: "테두리", free: "자유" };
      const lettering = Array.isArray(snapshot.lettering)
        ? snapshot.lettering
            .filter((item) => item.text?.trim())
            .map((item) => {
              const mode = item.mode === "arc" ? "곡선" : "직선";
              const placement = item.placement ? placementLabels[item.placement] ?? item.placement : "자유";
              return `${item.text} (${placement}/${mode}${item.fontSize ? `/${item.fontSize}px` : ""})`;
            })
            .join(", ")
        : "";

      const rows: Array<[string, unknown]> = [
        ["시뮬레이터 상품", snapshot.productKey ? getProduct(snapshot.productKey, activeProducts).title : snapshot.cakeType === "rice" ? "앙금떡케이크" : "디자인케이크"],
        ["시안 사이즈", snapshot.cakeSize],
        ["꽃 배치", snapshot.layoutPreset ? presetLabels[snapshot.layoutPreset] ?? snapshot.layoutPreset : ""],
        ["참고 이미지 용도", snapshot.referenceImageMode === "design-reference" ? "참고 디자인" : ""],
        ["시안 레터링", lettering],
      ];

      return rows
        .filter(([, value]) => Boolean(value))
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n");
    };

    const normalizedPhone = normalizeKoreanMobile(customer_phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "올바른 휴대폰 번호가 아닙니다." }, { status: 400 });
    }
    if (!PHONE_AUTH_DISABLED) {
      try {
        await verifyCustomerSession(customer_token, normalizedPhone);
      } catch {
        return NextResponse.json({ error: "휴대폰 인증 후 주문할 수 있습니다." }, { status: 401 });
      }
    }

    const supabase = await createServiceClient();
    const [{ data: productSettings }, { data: capacitySettings }, { data: capacityRow }] = await Promise.all([
      (supabase as any)
        .from("shop_settings")
        .select("value")
        .eq("key", "order_products")
        .maybeSingle(),
      (supabase as any)
        .from("shop_settings")
        .select("value")
        .eq("key", "daily_capacity")
        .maybeSingle(),
      (supabase as any)
        .from("shop_capacity")
        .select("max_orders, is_holiday, current_count")
        .eq("date", pickup_date)
        .maybeSingle(),
    ]);
    activeProducts = normalizeProductOptions(productSettings?.value);

    if (capacityRow?.is_holiday) {
      return NextResponse.json({ error: "선택한 날짜는 매장 휴무일입니다." }, { status: 409 });
    }
    const defaultMaxOrders = Number(capacitySettings?.value?.max_orders ?? 8);
    const maxOrders = Number(capacityRow?.max_orders ?? defaultMaxOrders);
    const currentCount = Number(capacityRow?.current_count ?? 0);
    if (Number.isFinite(maxOrders) && maxOrders > 0 && currentCount >= maxOrders) {
      return NextResponse.json({ error: "선택한 날짜는 예약이 마감되었습니다." }, { status: 409 });
    }

    const legacyPhone = phoneDigits(normalizedPhone);
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .in("phone", [normalizedPhone, legacyPhone])
      .maybeSingle();

    let customerId: string;

    if (existing?.id) {
      customerId = existing.id;
      await supabase.from("customers").update({
        phone: normalizedPhone,
        name: customer_name,
        allergy: allergy || (cake_details as CakeOrderDetails | undefined)?.allergy || null,
        updated_at: new Date().toISOString(),
      }).eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerErr } = await supabase
        .from("customers")
        .insert({ name: customer_name, phone: normalizedPhone, allergy: allergy || (cake_details as CakeOrderDetails | undefined)?.allergy || null })
        .select("id")
        .single();
      if (customerErr || !newCustomer) throw customerErr;
      customerId = newCustomer.id;
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `CF${today}${nanoid(4).toUpperCase()}`;
    const details = (cake_details ?? {}) as CakeOrderDetails;
    const priceQuote = calculatePrice(details, activeProducts);
    const requestedConsultation = true;

    let simulatorDetails = "";
    if (simulator_session_id) {
      const { data: simulatorSession } = await supabase
        .from("simulator_sessions")
        .select("state_json")
        .eq("id", simulator_session_id)
        .maybeSingle();
      simulatorDetails = formatSimulatorDetails(simulatorSession?.state_json);
    }

    const formattedDetails = formatCakeDetails(details as Record<string, unknown>);
    const combinedMessage = [
      formattedDetails,
      simulatorDetails,
      !formattedDetails && customer_message ? customer_message : "",
      !formattedDetails && allergy ? `알레르기: ${allergy}` : "",
    ].filter(Boolean).join("\n");

    const productionInsert = {
      order_number: orderNumber,
      customer_id: customerId,
      order_type,
      delivery_method,
      pickup_date,
      pickup_time: pickup_time ?? null,
      customer_message: combinedMessage || null,
      simulator_session_id: simulator_session_id ?? null,
      total_price: priceQuote.total,
      deposit_amount: 0,
      confirmed_price: null,
      payment_due_at: null,
      quote_status: getInitialQuoteStatus(requestedConsultation),
      requires_consultation: requestedConsultation,
      source_channel,
      status: "pending",
      payment_status: "unpaid",
    };

    let supportsProductionOps = true;
    let orderResult = await (supabase as any).from("orders").insert(productionInsert).select().single();

    if (orderResult.error && isMissingColumnError(orderResult.error)) {
      supportsProductionOps = false;
      console.warn("[orders POST] production columns missing; falling back to legacy order insert. Apply supabase/migrations/0002_production_ops.sql for full operations.");
      orderResult = await (supabase as any)
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          order_type,
          delivery_method,
          pickup_date,
          pickup_time: pickup_time ?? null,
          customer_message: combinedMessage || null,
          simulator_session_id: simulator_session_id ?? null,
          total_price: priceQuote.total,
          deposit_amount: priceQuote.total,
          status: "pending",
          payment_status: "unpaid",
        })
        .select()
        .single();
    }

    const { data: order, error: orderErr } = orderResult;
    const capacityError = getCapacityErrorMessage(orderErr);
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 409 });
    }
    if (orderErr || !order) throw orderErr;

    if (design_id) {
      const { data: design } = await supabase
        .from("cake_designs")
        .select("price_from, order_count")
        .eq("id", design_id)
        .single();

      const itemPayload = {
        order_id: order.id,
        product_type: "cake",
        cake_design_id: design_id,
        quantity: 1,
        unit_price: priceQuote.total || design?.price_from || 0,
        ...(supportsProductionOps ? { options_json: details as Record<string, unknown> } : {}),
      };
      await (supabase as any).from("order_items").insert(itemPayload);

      await supabase
        .from("cake_designs")
        .update({ order_count: (design?.order_count ?? 0) + 1 })
        .eq("id", design_id);
    }

    if (supportsProductionOps) {
      await recordOrderStatusEvent(supabase, {
        orderId: order.id,
        actorType: "customer",
        nextStatus: "pending",
        nextPaymentStatus: "unpaid",
        note: "계좌이체 안내 전 주문서 접수",
      });
    }

    await sendOperationalNotification(supabase, {
      orderId: order.id,
      customerId,
      phone: normalizedPhone,
      name: customer_name,
      templateKey: "quote_needed",
      variables: {
        고객명: customer_name,
        주문번호: orderNumber,
        픽업일: pickup_date,
        픽업시간: pickup_time ?? "",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        order_id: order.id,
        order_number: orderNumber,
        requires_consultation: true,
        quote_status: supportsProductionOps ? getInitialQuoteStatus(true) : "legacy_schema",
        payment_required: false,
        payment: null,
        production_schema_ready: supportsProductionOps,
      },
      { status: 201 }
    );
  } catch (err) {
    const capacityError = getCapacityErrorMessage(err);
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 409 });
    }
    console.error("[orders POST]", err);
    return NextResponse.json({ error: "주문 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const orderNumber = searchParams.get("order_number");

  const lookupLimit = checkRateLimit(`orders:lookup:${getClientIp(request)}`, 30, 10 * 60 * 1000);
  if (!lookupLimit.allowed) return rateLimitResponse(lookupLimit.resetAt);

  if (!phone || !orderNumber) {
    return NextResponse.json({ error: "주문번호와 주문자 휴대폰 번호를 함께 입력해주세요." }, { status: 400 });
  }

  if (orderNumber.length > 32) {
    return NextResponse.json({ error: "주문번호 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const normalizedPhone = normalizeKoreanMobile(phone);
  if (!normalizedPhone) return NextResponse.json({ orders: [] });
  const normalizedDigits = phoneDigits(normalizedPhone);

  const supabase = await createServiceClient();
  const query = (supabase as any)
    .from("orders")
    .select("*, customers(name, phone), order_items(*, cake_designs(title, thumbnail_url))")
    .eq("order_number", orderNumber)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).filter((order: { customers?: { phone?: string } | null }) =>
    phoneDigits(order.customers?.phone ?? "") === normalizedDigits
  );

  return NextResponse.json({
    orders: orders.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      order_type: order.order_type,
      status: order.status,
      pickup_date: order.pickup_date,
      pickup_time: order.pickup_time,
      total_price: order.total_price,
      confirmed_price: order.confirmed_price ?? null,
      payment_status: order.payment_status,
      quote_status: order.quote_status ?? null,
      requires_consultation: order.requires_consultation ?? true,
      customer_message: order.customer_message,
      created_at: order.created_at,
      customers: order.customers ? { phone: formatKoreanPhone(order.customers.phone) } : null,
      order_items: order.order_items ?? [],
    })),
  });
}
