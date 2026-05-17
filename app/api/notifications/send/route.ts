import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOperationalNotification, type NotificationTemplateKey } from "@/lib/notifications/aligo";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      order_id?: string;
      customer_id?: string;
      phone?: string;
      name?: string;
      template_key?: NotificationTemplateKey;
      variables?: Record<string, string | number | null | undefined>;
    };

    if (!body.phone || !body.template_key) {
      return NextResponse.json({ error: "phone, template_key 필요" }, { status: 400 });
    }

    const supabase = await createServiceClient();
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
