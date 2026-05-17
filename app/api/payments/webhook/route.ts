import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOperationalNotification } from "@/lib/notifications/aligo";
import { syncPaidPaymentToOrder, verifyPortOneWebhook } from "@/lib/payments/portone";

export async function POST(request: Request) {
  try {
    const webhook = await verifyPortOneWebhook(request);
    const paymentId = webhook.data?.paymentId;

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (webhook.type === "Transaction.Paid" || webhook.type === "Transaction.VirtualAccountIssued") {
      const { order, paidAmount, alreadyPaid } = await syncPaidPaymentToOrder(paymentId, "webhook");
      const customer = order.customers as { id?: string; name?: string; phone?: string } | null;
      if (!alreadyPaid && customer?.phone) {
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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payments/webhook]", err);
    return NextResponse.json({ error: "웹훅 처리 실패" }, { status: 400 });
  }
}
