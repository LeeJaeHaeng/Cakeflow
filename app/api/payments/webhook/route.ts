import { NextResponse } from "next/server";
import { syncPaidPaymentToOrder, verifyPortOneWebhook } from "@/lib/payments/portone";

export async function POST(request: Request) {
  try {
    const webhook = await verifyPortOneWebhook(request);
    const paymentId = webhook.data?.paymentId;

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (webhook.type === "Transaction.Paid" || webhook.type === "Transaction.VirtualAccountIssued") {
      await syncPaidPaymentToOrder(paymentId, "webhook");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payments/webhook]", err);
    return NextResponse.json({ error: "웹훅 처리 실패" }, { status: 400 });
  }
}
