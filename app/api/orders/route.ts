import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

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
      design_id,
      simulator_session_id,
      order_type = "cake",
      delivery_method = "pickup",
    } = body;

    if (!customer_name || !customer_phone || !pickup_date) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 고객 upsert (전화번호 기준)
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", customer_phone)
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
        .insert({ name: customer_name, phone: customer_phone })
        .select("id")
        .single();
      if (customerErr || !newCustomer) throw customerErr;
      customerId = newCustomer.id;
    }

    // 주문번호 생성 (CF + yyyyMMdd + 4자리 랜덤)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `CF${today}${nanoid(4).toUpperCase()}`;

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
        customer_message: [customer_message, allergy ? `알레르기: ${allergy}` : ""].filter(Boolean).join("\n") || null,
        simulator_session_id: simulator_session_id ?? null,
        total_price: 0,
        deposit_amount: 0,
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
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!customer) return NextResponse.json({ orders: [] });
    query = query.eq("customer_id", customer.id);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: data ?? [] });
}
