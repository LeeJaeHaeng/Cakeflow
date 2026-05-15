import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import { calculatePrice, formatWon, getProduct, type CakeOrderDetails } from "@/lib/orders/pricing";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      pickup_date,
      pickup_time,
      customer_message,
      allergy,
      cake_details,
      design_id,
      simulator_session_id,
      order_type = "cake",
      delivery_method = "pickup",
    } = body;

    if (!customer_name || !customer_phone || !pickup_date) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

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
        ["선입금 안내", "예약은 결제금액 100% 선입금 완료 후 확정"],
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
        cakeSize?: string;
        layoutPreset?: string | null;
        referenceImageMode?: string;
        lettering?: Array<{
          text?: string;
          mode?: string;
          placement?: string;
          fontSize?: number;
        }>;
      };
      const presetLabels: Record<string, string> = {
        crescent: "크레센트",
        wreath: "리스",
        half: "반달",
        dome: "돔형",
        free: "프리스타일",
      };
      const placementLabels: Record<string, string> = {
        center: "중앙",
        bottom: "하단",
        edge: "테두리",
        free: "자유",
      };
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
        ["시뮬레이터", snapshot.cakeType === "rice" ? "앙금떡케이크" : "디자인케이크"],
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

    // 전화번호 정규화: 숫자만 추출 후 010-XXXX-XXXX 형식
    const phoneDigits = String(customer_phone).replace(/[^0-9]/g, "");
    const normalizedPhone = phoneDigits.length === 11
      ? `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7)}`
      : customer_phone;

    const supabase = await createServiceClient();

    // 고객 upsert (전화번호 기준)
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
        updated_at: new Date().toISOString(),
      }).eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerErr } = await supabase
        .from("customers")
        .insert({ name: customer_name, phone: normalizedPhone })
        .select("id")
        .single();
      if (customerErr || !newCustomer) throw customerErr;
      customerId = newCustomer.id;
    }

    // 주문번호 생성 (CF + yyyyMMdd + 4자리 랜덤)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `CF${today}${nanoid(4).toUpperCase()}`;
    const priceQuote = calculatePrice(cake_details as CakeOrderDetails);
    let simulatorDetails = "";
    if (simulator_session_id) {
      const { data: simulatorSession } = await supabase
        .from("simulator_sessions")
        .select("state_json")
        .eq("id", simulator_session_id)
        .maybeSingle();
      simulatorDetails = formatSimulatorDetails(simulatorSession?.state_json);
    }

    const formattedDetails = formatCakeDetails(cake_details);
    const combinedMessage = [
      formattedDetails,
      simulatorDetails,
      !formattedDetails && customer_message ? customer_message : "",
      !formattedDetails && allergy ? `알레르기: ${allergy}` : "",
    ].filter(Boolean).join("\n");

    // 주문 생성
    const { data: order, error: orderErr } = await supabase
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

    if (orderErr || !order) throw orderErr;

    // 케이크 디자인 주문 아이템 추가
    if (design_id) {
      const { data: design } = await supabase
        .from("cake_designs")
        .select("price_from")
        .eq("id", design_id)
        .single();

      await supabase.from("order_items").insert({
        order_id: order.id,
        product_type: "cake",
        cake_design_id: design_id,
        quantity: 1,
        unit_price: design?.price_from ?? 0,
      });

      // 주문 수 증가
      await supabase
        .from("cake_designs")
        .update({ order_count: (design?.price_from ? 1 : 1) })
        .eq("id", design_id);
    }

    return NextResponse.json(
      { ok: true, order_id: order.id, order_number: orderNumber },
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

  let query = supabase
    .from("orders")
    .select("*, customers(name, phone), order_items(*, cake_designs(title, thumbnail_url))")
    .order("created_at", { ascending: false });

  if (orderNumber) {
    query = query.eq("order_number", orderNumber);
  } else if (phone) {
    // 전화번호 정규화 후 조회
    const digits = String(phone).replace(/[^0-9]/g, "");
    const normalizedPhone = digits.length === 11
      ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
      : phone;

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

  return NextResponse.json({ orders: data ?? [] });
}
