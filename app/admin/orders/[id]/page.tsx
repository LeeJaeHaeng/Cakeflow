import Link from "next/link";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/orders/status";
import { formatKoreanPhone } from "@/lib/phone";

const STATUS_ACTIONS = [
  { status: "confirmed", label: "예약 확정" },
  { status: "producing", label: "제작 시작" },
  { status: "ready", label: "픽업 준비 완료" },
  { status: "completed", label: "픽업 완료" },
  { status: "cancelled", label: "취소" },
] as const;

function formatWon(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "입금 전",
  partial: "일부 입금",
  paid: "입금 완료",
  refunded: "환불 완료",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  not_required: "견적 불필요",
  pending_quote: "견적 안내 필요",
  quoted: "견적 안내 완료",
  accepted: "고객 수락",
  expired: "견적 만료",
  legacy_schema: "이전 주문",
};

const ACTOR_LABELS: Record<string, string> = {
  customer: "고객",
  admin: "관리자",
  system: "시스템",
  webhook: "자동 처리",
};

const NOTIFICATION_TEMPLATE_LABELS: Record<string, string> = {
  order_received: "주문 접수 안내",
  payment_paid: "입금 확인 안내",
  quote_needed: "상담 필요 안내",
  confirmed: "예약 확정 안내",
  producing: "제작 시작 안내",
  ready: "픽업 준비 안내",
  completed: "픽업 완료 안내",
  cancelled: "주문 취소 안내",
  review_request: "리뷰 요청",
};

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  sent: "발송 완료",
  failed: "발송 실패",
  fallback_sent: "문자 대체 발송",
};

const CHANNEL_LABELS: Record<string, string> = {
  alimtalk: "알림톡",
  sms: "문자",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function parseOrderMessage(message: string | null | undefined) {
  if (!message) return [];
  return message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(":");
      if (index < 0) return { label: "요청 내용", value: line };
      return {
        label: line.slice(0, index).trim(),
        value: line.slice(index + 1).trim(),
      };
    })
    .filter((item) => item.value && item.label !== "참고사진 URL");
}

function getOrderItemDetails(order: any) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const optionRows = items
    .map((item: any) => item?.options_json)
    .filter((options: unknown) => options && typeof options === "object") as Array<Record<string, unknown>>;
  return optionRows.find((options) => typeof options.reference_image_url === "string" && options.reference_image_url.trim()) ?? optionRows[0] ?? {};
}

function getCakeDetails(order: any) {
  const details = order.cake_details;
  return details && typeof details === "object" ? details : getOrderItemDetails(order);
}

function extractMessageField(message: string | null | undefined, label: string) {
  if (!message) return "";
  const prefix = `${label}:`;
  return message
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(prefix))
    ?.slice(prefix.length)
    .trim() ?? "";
}

function getReferenceImageUrl(order: any, cakeDetails: any) {
  const candidates = [
    cakeDetails.reference_image_url,
    getOrderItemDetails(order).reference_image_url,
    extractMessageField(order.customer_message, "참고사진 URL"),
  ];

  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

async function getOrder(id: string) {
  const supabase = await createServiceClient();
  const { data: order } = await (supabase as any)
    .from("orders")
    .select(`
      *,
      customers(id, name, phone, allergy, memo, vip_flag, total_orders, total_amount),
      order_items(*, cake_designs(title, thumbnail_url), dessert_products:dessert_id(title)),
      simulator_sessions(preview_url, production_url, summary, state_json),
      payments(*),
      order_status_events(*),
      notification_logs(*)
    `)
    .eq("id", id)
    .single();
  return order;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) redirect("/admin/orders");

  const customer = order.customers;
  const simulator = order.simulator_sessions;
  const payments = (order.payments ?? []) as any[];
  const events = ([...(order.order_status_events ?? [])] as any[]).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const notifications = ([...(order.notification_logs ?? [])] as any[]).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const statusLabel = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status;
  const paymentLabel = PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status;
  const quoteLabel = QUOTE_STATUS_LABELS[order.quote_status] ?? order.quote_status ?? "견적 불필요";
  const orderFields = parseOrderMessage(order.customer_message);
  const cakeDetails = getCakeDetails(order);
  const referenceImageUrl = getReferenceImageUrl(order, cakeDetails);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
            ← 주문 목록
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {customer?.name ?? "고객명 없음"} · {order.pickup_date} {order.pickup_time ?? ""}
          </p>
        </div>
        <a
          href={`/api/admin/orders/${order.id}/work-order`}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          작업지시서 PDF 다운로드
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">주문 상태</p>
              <h2 className="mt-1 text-xl font-bold">{statusLabel}</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {paymentLabel}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Info label="결제/확정금액" value={formatWon(order.confirmed_price ?? order.total_price)} />
            <Info label="견적 상태" value={quoteLabel} />
            <Info label="협의 필요" value={order.requires_consultation ? "필요" : "불필요"} />
          </div>

          <form action={`/api/admin/orders/${order.id}/quote`} method="post" className="mt-5 rounded-2xl bg-muted/50 p-4">
            <p className="text-sm font-semibold">협의 주문 확정</p>
            <p className="mt-1 text-xs text-muted-foreground">사장님 협의 후 계좌이체 입금이 확인되면 확정 금액과 함께 예약을 확정합니다.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                name="confirmed_price"
                type="number"
                min={0}
                defaultValue={order.confirmed_price ?? order.total_price}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <button formAction={`/api/admin/orders/${order.id}/quote`} className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">
                입금 확인/예약 확정
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {STATUS_ACTIONS.map((action) => (
              <form key={action.status} action={`/api/admin/orders/${order.id}/status`} method="post">
                <input type="hidden" name="status" value={action.status} />
                <button className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                  {action.label}
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">고객/픽업</h2>
          <div className="mt-4 space-y-3">
            <Info label="고객명" value={customer?.name ?? "-"} />
            <Info label="전화번호" value={formatKoreanPhone(customer?.phone ?? "-")} />
            <Info label="알러지" value={customer?.allergy ?? "-"} />
            <Info label="고객 메모" value={customer?.memo ?? "-"} />
            <Info label="픽업" value={`${order.pickup_date} ${order.pickup_time ?? ""}`} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">주문서 상세 내용</h2>
          {orderFields.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">주문서 내용 없음</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {orderFields.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          )}
          {referenceImageUrl && (
            <div className="mt-4">
              <p className="text-sm font-semibold">고객 첨부 이미지</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referenceImageUrl}
                alt="고객 첨부 참고사진"
                className="mt-2 max-h-[520px] w-full rounded-2xl border border-border object-contain"
              />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">시뮬레이터/제작 자료</h2>
          {simulator?.production_url || simulator?.preview_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={simulator.production_url ?? simulator.preview_url}
              alt="시뮬레이터 미리보기"
              className="mt-3 aspect-square w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="mt-3 flex aspect-square items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
              첨부된 시뮬레이터 이미지 없음
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <History title="결제 이력" items={payments} empty="결제 이력이 없습니다." render={(payment) => (
          <>
            <p className="font-medium">{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status} · {formatWon(payment.amount)}</p>
            <p className="text-xs text-muted-foreground">{payment.method ? `결제 방식: ${payment.method}` : payment.payment_id}</p>
            {payment.created_at && <p className="text-xs text-muted-foreground">{formatDateTime(payment.created_at)}</p>}
          </>
        )} />
        <History title="상태 이력" items={events} empty="상태 이력이 없습니다." render={(event) => (
          <>
            <p className="font-medium">
              {event.previous_status ? STATUS_LABELS[event.previous_status as keyof typeof STATUS_LABELS] ?? event.previous_status : "신규"}
              {" → "}
              {STATUS_LABELS[event.next_status as keyof typeof STATUS_LABELS] ?? event.next_status}
            </p>
            <p className="text-xs text-muted-foreground">{ACTOR_LABELS[event.actor_type] ?? event.actor_type} · {formatDateTime(event.created_at)}</p>
            {event.note && <p className="mt-1 text-xs text-muted-foreground">{event.note}</p>}
          </>
        )} />
        <History title="알림 이력" items={notifications} empty="알림 이력이 없습니다." render={(log) => (
          <>
            <p className="font-medium">
              {NOTIFICATION_TEMPLATE_LABELS[log.template_key] ?? log.template_key} · {NOTIFICATION_STATUS_LABELS[log.status] ?? log.status}
            </p>
            <p className="text-xs text-muted-foreground">{CHANNEL_LABELS[log.channel] ?? log.channel} · {formatDateTime(log.created_at)}</p>
            {log.error_message && <p className="mt-1 text-xs text-red-600">{log.error_message}</p>}
          </>
        )} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">{value}</p>
    </div>
  );
}

function History<T>({
  title,
  items,
  empty,
  render,
}: {
  title: string;
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="rounded-xl bg-muted p-3 text-sm">
              {render(item)}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
