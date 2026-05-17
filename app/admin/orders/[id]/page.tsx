import Link from "next/link";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/orders/status";

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
          작업지시서 다운로드
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
              {order.payment_status}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Info label="결제/확정금액" value={formatWon(order.confirmed_price ?? order.total_price)} />
            <Info label="견적 상태" value={order.quote_status ?? "not_required"} />
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
            <Info label="전화번호" value={customer?.phone ?? "-"} />
            <Info label="알러지" value={customer?.allergy ?? "-"} />
            <Info label="고객 메모" value={customer?.memo ?? "-"} />
            <Info label="픽업" value={`${order.pickup_date} ${order.pickup_time ?? ""}`} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">주문서 원문</h2>
          <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl bg-muted p-4 text-sm leading-relaxed">
            {order.customer_message ?? "주문서 내용 없음"}
          </pre>
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
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl bg-muted p-3 text-xs">
            {JSON.stringify(simulator?.summary ?? simulator?.state_json ?? {}, null, 2)}
          </pre>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <History title="결제 이력" items={payments} empty="결제 이력이 없습니다." render={(payment) => (
          <>
            <p className="font-medium">{payment.status} · {formatWon(payment.amount)}</p>
            <p className="text-xs text-muted-foreground">{payment.payment_id ?? payment.method}</p>
          </>
        )} />
        <History title="상태 이력" items={events} empty="상태 이력이 없습니다." render={(event) => (
          <>
            <p className="font-medium">{event.previous_status ?? "-"} → {event.next_status}</p>
            <p className="text-xs text-muted-foreground">{event.actor_type} · {event.created_at}</p>
          </>
        )} />
        <History title="알림 이력" items={notifications} empty="알림 이력이 없습니다." render={(log) => (
          <>
            <p className="font-medium">{log.template_key} · {log.status}</p>
            <p className="text-xs text-muted-foreground">{log.channel} · {log.created_at}</p>
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
