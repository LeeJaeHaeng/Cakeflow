import { nanoid } from "nanoid";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ProductionOrderStatus =
  | "pending"
  | "confirmed"
  | "producing"
  | "ready"
  | "completed"
  | "cancelled"
  | "refunded";

export type QuoteStatus = "not_required" | "pending_quote" | "quoted" | "accepted" | "expired";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export const STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  pending: "접수",
  confirmed: "예약확정",
  producing: "제작중",
  ready: "픽업대기",
  completed: "완료",
  cancelled: "취소",
  refunded: "환불",
};

export const STATUS_TEMPLATE_KEYS: Partial<Record<ProductionOrderStatus, string>> = {
  confirmed: "confirmed",
  producing: "producing",
  ready: "ready",
  completed: "completed",
  cancelled: "cancelled",
};

export function shouldRequireConsultation(quoteExact: boolean, paymentMethod?: string) {
  return !quoteExact || paymentMethod === "bank_transfer";
}

export function getInitialQuoteStatus(requiresConsultation: boolean): QuoteStatus {
  return requiresConsultation ? "pending_quote" : "not_required";
}

export function buildPaymentId(orderNumber: string) {
  return `cakeflow-${orderNumber}-${nanoid(8)}`;
}

export async function recordOrderStatusEvent(
  supabase: SupabaseClient<Database>,
  input: {
    orderId: string;
    actorType?: "customer" | "admin" | "system" | "webhook";
    actorId?: string | null;
    previousStatus?: ProductionOrderStatus | null;
    nextStatus: ProductionOrderStatus;
    previousPaymentStatus?: PaymentStatus | null;
    nextPaymentStatus?: PaymentStatus | null;
    note?: string | null;
    notificationSent?: boolean;
  }
) {
  const { error } = await (supabase as any).from("order_status_events").insert({
    order_id: input.orderId,
    actor_type: input.actorType ?? "system",
    actor_id: input.actorId ?? null,
    previous_status: input.previousStatus ?? null,
    next_status: input.nextStatus,
    previous_payment_status: input.previousPaymentStatus ?? null,
    next_payment_status: input.nextPaymentStatus ?? null,
    note: input.note ?? null,
    notification_sent: input.notificationSent ?? false,
  });

  if (error) {
    console.warn("[order status event skipped]", error);
  }
}
