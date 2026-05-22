import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { sendOperationalNotification, type NotificationTemplateKey } from "@/lib/notifications/aligo";
import { sendReviewRequestNotification } from "@/lib/reviews/tokens";

export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const body = await request.json() as {
      order_id?: string;
      customer_id?: string;
      phone?: string;
      name?: string;
      template_key?: NotificationTemplateKey;
      variables?: Record<string, string | number | null | undefined>;
    };

    if (!body.template_key) {
      return NextResponse.json({ error: "template_key 필요" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    if (body.template_key === "review_request" && body.order_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: order, error } = await (supabase as any)
        .from("orders")
        .select("id, order_number, pickup_date, pickup_time, customer_id, customers(id, name, phone)")
        .eq("id", body.order_id)
        .maybeSingle();

      if (error || !order) return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
      const result = await sendReviewRequestNotification(supabase, request.url, order);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (!body.phone) {
      return NextResponse.json({ error: "phone 필요" }, { status: 400 });
    }

    const result = await sendOperationalNotification(supabase, {
      orderId: body.order_id,
      customerId: body.customer_id,
      phone: body.phone,
      name: body.name,
      templateKey: body.template_key,
      variables: body.variables,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[notifications/send]", err);
    return NextResponse.json({ error: "알림 발송 실패" }, { status: 500 });
  }
}
