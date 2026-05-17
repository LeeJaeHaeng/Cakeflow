import { PaymentClient, Webhook } from "@portone/server-sdk";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";

export interface PortOnePayment {
  id?: string;
  paymentId?: string;
  status?: string;
  amount?: {
    total?: number;
  };
  method?: {
    type?: string;
  };
  paymentMethod?: {
    type?: string;
  };
  transactionId?: string;
  transactions?: Array<{ id?: string; transactionId?: string }>;
  [key: string]: unknown;
}

export function getPublicPortOneConfig() {
  return {
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "",
    channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "",
  };
}

export async function fetchPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error("PORTONE_API_SECRET_MISSING");

  const client = PaymentClient({ secret });
  return client.getPayment({ paymentId }) as Promise<PortOnePayment>;
}

export async function cancelPortOnePayment(paymentId: string, reason: string, amount?: number) {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error("PORTONE_API_SECRET_MISSING");

  const client = PaymentClient({ secret });
  return client.cancelPayment({ paymentId, reason, ...(amount ? { amount } : {}) });
}

export function getPaymentTotal(payment: PortOnePayment) {
  return Number(payment.amount?.total ?? 0);
}

export function getPaymentMethod(payment: PortOnePayment) {
  return payment.method?.type ?? payment.paymentMethod?.type ?? "CARD";
}

export function getTransactionId(payment: PortOnePayment) {
  return payment.transactionId ?? payment.transactions?.[0]?.id ?? payment.transactions?.[0]?.transactionId ?? null;
}

export async function verifyPortOneWebhook(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.PORTONE_WEBHOOK_SECRET;

  if (!secret) {
    return JSON.parse(rawBody) as { type?: string; data?: { paymentId?: string } };
  }

  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };

  return Webhook.verify(secret, rawBody, headers) as Promise<{ type?: string; data?: { paymentId?: string } }>;
}

export async function syncPaidPaymentToOrder(paymentId: string, actorType: "customer" | "webhook" = "webhook") {
  const supabase = await createServiceClient();
  const payment = await fetchPortOnePayment(paymentId);
  const paid = payment.status === "PAID";

  const { data: localPayment, error: paymentError } = await (supabase as any)
    .from("payments")
    .select("*, orders(id, status, payment_status, total_price, confirmed_price, customer_id, order_number, pickup_date, pickup_time, customers(id, name, phone))")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (paymentError || !localPayment) {
    throw new Error("LOCAL_PAYMENT_NOT_FOUND");
  }

  const order = localPayment.orders as any;
  const alreadyPaid = localPayment.status === "paid" || order.payment_status === "paid";
  const expectedAmount = Number(order.confirmed_price ?? order.total_price);
  const paidAmount = getPaymentTotal(payment);

  await (supabase as any).from("payment_events").insert({
    order_id: order.id,
    payment_id: paymentId,
    event_type: payment.status ?? "UNKNOWN",
    raw_payload: payment,
  });

  if (!paid || paidAmount !== expectedAmount) {
    await (supabase as any)
      .from("payments")
      .update({
        status: paid ? "amount_mismatch" : String(payment.status ?? "failed").toLowerCase(),
        raw_payload: payment,
      })
      .eq("id", localPayment.id);
    throw new Error(paid ? "PAYMENT_AMOUNT_MISMATCH" : "PAYMENT_NOT_PAID");
  }

  await (supabase as any)
    .from("payments")
    .update({
      amount: paidAmount,
      method: getPaymentMethod(payment),
      portone_transaction_id: getTransactionId(payment),
      status: "paid",
      raw_payload: payment,
      paid_at: new Date().toISOString(),
    })
    .eq("id", localPayment.id);

  const nextStatus = order.status === "pending" ? "confirmed" : order.status;
  await (supabase as any)
    .from("orders")
    .update({
      payment_status: "paid",
      status: nextStatus,
      quote_status: "accepted",
      confirmed_price: paidAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  await (supabase as any).from("order_status_events").insert({
    order_id: order.id,
    actor_type: actorType,
    previous_status: order.status,
    next_status: nextStatus,
    previous_payment_status: order.payment_status,
    next_payment_status: "paid",
    note: "PortOne 결제 승인 동기화",
  });

  return { order, payment, paidAmount, alreadyPaid };
}
