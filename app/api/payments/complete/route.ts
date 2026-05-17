import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOperationalNotification } from "@/lib/notifications/aligo";
import { syncPaidPaymentToOrder } from "@/lib/payments/portone";

export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();
    if (!paymentId) return NextResponse.json({ error: "paymentId 필요" }, { status: 400 });

    const { order, paidAmount } = await syncPaidPaymentToOrder(paymentId, "customer");
    const customer = order.customers as { id?: string; name?: string; phone?: string } | null;

    if (customer?.phone) {
      const supabase = await createServiceClient();
      await sendOperationalNotification(supabase, {
        orderId: order.id,
        customerId: order.customer_id,
        phone: customer.phone,
        name: customer.name,
        templateKey: "payment_paid",
        variables: {
          고객명: customer.name,
          주문번호: order.order_number,
          결제금액: paidAmount.toLocaleString("ko-KR"),
        },
      });
    }

    return NextResponse.json({ ok: true, order_id: order.id, order_number: order.order_number });
  } catch (err) {
    console.error("[payments/complete]", err);
    return NextResponse.json({ error: "결제 검증에 실패했습니다." }, { status: 400 });
  }
}
