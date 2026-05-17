"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, Loader2, Package, Phone, Search, Star, Truck } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  pickup_date: string;
  pickup_time: string | null;
  total_price: number;
  confirmed_price?: number | null;
  payment_status?: string;
  quote_status?: string;
  requires_consultation?: boolean;
  admin_memo?: string | null;
  customer_message: string | null;
  order_type: string;
  customers: { name: string; phone: string } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    cake_designs: { title: string; thumbnail_url: string } | null;
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; desc: string }> = {
  pending: { label: "접수 대기", color: "text-amber-600 bg-amber-50", icon: Clock, desc: "주문이 접수되었습니다. 사장님 확인 중입니다." },
  confirmed: { label: "예약 확정", color: "text-blue-600 bg-blue-50", icon: CheckCircle2, desc: "예약이 확정되었습니다. 픽업일에 맞춰 준비합니다." },
  producing: { label: "제작 중", color: "text-purple-600 bg-purple-50", icon: Package, desc: "케이크를 정성껏 제작하고 있습니다." },
  ready: { label: "픽업 가능", color: "text-green-600 bg-green-50", icon: Truck, desc: "케이크 준비가 완료되었습니다. 매장으로 방문해주세요." },
  completed: { label: "완료", color: "text-gray-600 bg-gray-50", icon: Star, desc: "픽업이 완료되었습니다. 이용해주셔서 감사합니다." },
  cancelled: { label: "취소", color: "text-red-600 bg-red-50", icon: AlertCircle, desc: "주문이 취소되었습니다." },
  refunded: { label: "환불", color: "text-red-600 bg-red-50", icon: AlertCircle, desc: "주문이 환불 처리되었습니다." },
};

const STATUS_STEPS = ["pending", "confirmed", "producing", "ready", "completed"];

function OrderStatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-start justify-between">
      {STATUS_STEPS.map((step, index) => {
        const active = index <= currentIdx;
        const config = STATUS_CONFIG[step];
        return (
          <div key={step} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {active ? "✓" : index + 1}
              </div>
              <p className={`mt-1 text-center text-[9px] leading-tight ${active ? "font-medium text-primary" : "text-muted-foreground"}`}>
                {config.label}
              </p>
            </div>
            {index < STATUS_STEPS.length - 1 && (
              <div className={`mt-3 h-0.5 flex-1 ${index < currentIdx ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const firstItem = order.order_items?.[0];
  const design = firstItem?.cake_designs;
  const amount = Number(order.confirmed_price ?? order.total_price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className={`flex items-center gap-2 px-4 py-2.5 ${config.color}`}>
        <StatusIcon size={14} />
        <span className="text-xs font-semibold">{config.label}</span>
        <span className="ml-auto text-xs opacity-70">#{order.order_number}</span>
      </div>

      {order.status !== "cancelled" && order.status !== "refunded" && (
        <div className="px-4 pb-2 pt-3">
          <OrderStatusTimeline status={order.status} />
          <p className="mt-3 text-center text-xs text-muted-foreground">{config.desc}</p>
        </div>
      )}

      <div className="border-t border-border p-4">
        {design && (
          <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
              {design.thumbnail_url ? (
                <Image src={design.thumbnail_url} alt={design.title} fill className="object-cover" sizes="48px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl">🎂</div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{design.title}</p>
              <p className="text-xs text-muted-foreground">케이크 × {firstItem?.quantity}</p>
            </div>
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-2 border-b border-border pb-3 text-sm">
          <div className="rounded-xl bg-muted p-2">
            <p className="text-xs text-muted-foreground">결제상태</p>
            <p className="font-semibold">{order.payment_status ?? "unpaid"}</p>
          </div>
          <div className="rounded-xl bg-muted p-2">
            <p className="text-xs text-muted-foreground">예약방식</p>
            <p className="font-semibold">계좌이체 확정</p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">픽업일</span>
            <span className="font-medium">{order.pickup_date} {order.pickup_time ?? ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">결제/확정금액</span>
            <span className="font-medium">₩{amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">주문일</span>
            <span>{new Date(order.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
          {order.admin_memo && (
            <div>
              <span className="text-muted-foreground">사장님 메모</span>
              <p className="mt-1 rounded-lg bg-primary/5 p-2 text-xs text-primary">{order.admin_memo}</p>
            </div>
          )}
          {order.customer_message && (
            <div>
              <span className="text-muted-foreground">요청사항</span>
              <p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-2 text-xs">{order.customer_message}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("order_number") ?? "";
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async (overrideOrderNumber?: string) => {
    const queryOrderNumber = overrideOrderNumber ?? orderNumber;
    if (!queryOrderNumber && (!phone || phone.length < 10)) return;
    setLoading(true);
    setSearched(false);
    try {
      const params = new URLSearchParams();
      if (queryOrderNumber) params.set("order_number", queryOrderNumber);
      if (phone) params.set("phone", phone);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setSearched(true);
    } catch {
      setOrders([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) queueMicrotask(() => { void search(initialOrderNumber); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderNumber]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🎂</div>
          <h1 className="text-2xl font-bold">주문 조회</h1>
          <p className="mt-1 text-sm text-muted-foreground">주문번호 또는 휴대폰 번호로 진행 상태를 확인하세요</p>
        </div>

        <div className="mb-6 space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="주문번호 CF..."
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="h-12 w-full rounded-xl bg-muted pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && search()}
                className="h-12 w-full rounded-xl bg-muted pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={() => search()}
              disabled={loading || (!orderNumber && phone.length < 10)}
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              style={{ minHeight: "unset" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              조회
            </button>
          </div>
        </div>

        <AnimatePresence>
          {searched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {orders && orders.length > 0 ? (
                orders.map((order) => <OrderCard key={order.id} order={order} />)
              ) : (
                <div className="py-16 text-center">
                  <p className="mb-3 text-3xl">🔍</p>
                  <p className="text-sm text-muted-foreground">주문 내역이 없습니다.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <TrackContent />
    </Suspense>
  );
}
