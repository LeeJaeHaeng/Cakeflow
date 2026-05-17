import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import { calculatePrice, formatWon, getProduct, type CakeOrderDetails, type ProductKey } from "@/lib/orders/pricing";
import { sendOperationalNotification } from "@/lib/notifications/aligo";
import { buildPaymentId, getInitialQuoteStatus, recordOrderStatusEvent, shouldRequireConsultation } from "@/lib/orders/status";
import { getPublicPortOneConfig } from "@/lib/payments/portone";
import { verifyCustomerSession } from "@/lib/auth/customer";
import { normalizeKoreanMobile } from "@/lib/phone";

export async function POST(request: Request) {
  try {
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

    const isMissingColumnError = (error: unknown) => {
      if (!error || typeof error !== "object") return false;
      const err = error as { code?: string; message?: string };
      return err.code === "PGRST204" || Boolean(err.message?.includes("schema cache"));
    };

    const formatCakeDetails = (details: Record<string, unknown> | null | undefined) => {
      if (!details || typeof details !== "object") return "";
      const quote = calculatePrice(details as CakeOrderDetails);
      const product = getProduct((details as CakeOrderDetails).product_key);
      const paymentMethod = details.payment_method === "bank_transfer" ? "계좌이체" : "카드결제";

      const rows: Array<[string, unknown]> = [
        ["상품", product.title],
        ["사이즈", details.size],
        ["빵맛", details.sheet_flavor],
        ["떡 종류", details.rice_base],
        ["숫자 개수", details.product_key === "number_rice" ? `${details.number_count ?? 2}개` : ""],
        ["앙금 스타일", details.rice_flower_style === "wreath" ? "리스 스타일" : details.rice_flower_style === "blossom" ? "블라썸 스타일" : ""],
        ["필링", Array.isArray(details.filling) ? details.filling.join(", ") : ""],
        ["디자인 설명", details.design_style],
        ["색감", details.desired_color],
        ["문구", details.phrase],
        ["문구 추가", details.lettering ? "희망" : ""],
        ["토퍼 요청", details.topper_request],
        ["피규어 요청", details.figure_request],
        ["2단/높이 상담", details.two_tier ? "희망" : ""],
        ["초 추가", details.candle ? "희망" : ""],
        ["참고사진/설명", details.reference_note],
        ["알레르기", details.allergy],
        ["기타 요청", details.extra_request],
        ["기본금액", formatWon(quote.basePrice)],
        ["확정 추가금", quote.addOns.length > 0 ? quote.addOns.map((item) => `${item.label} +${formatWon(item.amount)}`).join(", ") : ""],
        ["상담 필요 추가금", quote.unknownItems.join(", ")],
        ["선입금 결제금액", `${formatWon(quote.total)}${quote.exact ? "" : " + 상담 후 추가금"}`],
        ["결제 방식", paymentMethod],
        ["예약 안내", quote.exact && details.payment_method === "card" ? "카드 결제 완료 후 예약 확정" : "사장님 확인 후 카카오톡/전화 상담 및 계좌이체 입금으로 예약 확정"],
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
        ["시뮬레이터 상품", snapshot.productKey ? getProduct(snapshot.productKey).title : snapshot.cakeType === "rice" ? "앙금떡케이크" : "디자인케이크"],
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
    try {
      await verifyCustomerSession(customer_token, normalizedPhone);
    } catch {
      return NextResponse.json({ error: "휴대폰 인증 후 주문할 수 있습니다." }, { status: 401 });
    }

    const supabase = await createServiceClient();

    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    let customerId: string;

    if (existing?.id) {
      customerId = existing.id;
      await supabase.from("customers").update({
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
    const priceQuote = calculatePrice(details);
    const paymentMethod = details.payment_method ?? "card";
    const requestedConsultation = shouldRequireConsultation(priceQuote.exact, paymentMethod);
    const paymentDueAt = !requestedConsultation ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

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
      deposit_amount: requestedConsultation ? 0 : priceQuote.total,
      confirmed_price: requestedConsultation ? null : priceQuote.total,
      payment_due_at: paymentDueAt,
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
        note: requestedConsultation ? "상담 필요 주문서 접수" : "결제 가능 주문서 접수",
      });
    }

    let paymentPayload: { payment_id: string; store_id: string; channel_key: string; order_name: string; amount: number } | null = null;
    if (supportsProductionOps && !requestedConsultation && paymentMethod === "card") {
      const paymentId = buildPaymentId(orderNumber);
      const portoneConfig = getPublicPortOneConfig();
      const paymentInsert = await (supabase as any).from("payments").insert({
        order_id: order.id,
        amount: priceQuote.total,
        method: "CARD",
        payment_id: paymentId,
        channel_key: portoneConfig.channelKey || null,
        status: "pending",
      });
      if (!paymentInsert.error) {
        paymentPayload = {
          payment_id: paymentId,
          store_id: portoneConfig.storeId,
          channel_key: portoneConfig.channelKey,
          order_name: `${getProduct(details.product_key).title} ${orderNumber}`,
          amount: priceQuote.total,
        };
      }
    }

    await sendOperationalNotification(supabase, {
      orderId: order.id,
      customerId,
      phone: normalizedPhone,
      name: customer_name,
      templateKey: supportsProductionOps && requestedConsultation ? "quote_needed" : "order_received",
      variables: {
        고객명: customer_name,
        주문번호: orderNumber,
        픽업일: pickup_date,
        픽업시간: pickup_time ?? "",
      },
    });

    const effectiveRequiresConsultation = requestedConsultation || !supportsProductionOps || !paymentPayload;
    return NextResponse.json(
      {
        ok: true,
        order_id: order.id,
        order_number: orderNumber,
        requires_consultation: effectiveRequiresConsultation,
        quote_status: supportsProductionOps ? getInitialQuoteStatus(effectiveRequiresConsultation) : "legacy_schema",
        payment_required: Boolean(paymentPayload),
        payment: paymentPayload,
        production_schema_ready: supportsProductionOps,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[orders POST]", err);
    return NextResponse.json({ error: "주문 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const orderNumber = searchParams.get("order_number");

  if (!phone && !orderNumber) {
    return NextResponse.json({ error: "전화번호 또는 주문번호 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  let query = (supabase as any)
    .from("orders")
    .select("*, customers(name, phone), order_items(*, cake_designs(title, thumbnail_url))")
    .order("created_at", { ascending: false });

  if (orderNumber) {
    query = query.eq("order_number", orderNumber);
  } else if (phone) {
    const normalizedPhone = normalizeKoreanMobile(phone);
    if (!normalizedPhone) return NextResponse.json({ orders: [] });

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (!customer) return NextResponse.json({ orders: [] });
    query = query.eq("customer_id", customer.id);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let orders = data ?? [];
  if (phone && orderNumber) {
    const normalizedPhone = normalizeKoreanMobile(phone);
    orders = orders.filter((order: { customers?: { phone?: string } | null }) => order.customers?.phone === normalizedPhone);
  }

  return NextResponse.json({ orders });
}
