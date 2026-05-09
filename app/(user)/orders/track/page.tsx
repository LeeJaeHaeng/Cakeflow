"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Star,
  AlertCircle,
} from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  pickup_date: string;
  pickup_time: string | null;
  total_price: number;
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
  confirmed: { label: "주문 확인", color: "text-blue-600 bg-blue-50", icon: CheckCircle2, desc: "주문이 확인되었습니다. 디자인 상담 후 제작을 시작합니다." },
  producing: { label: "제작 중", color: "text-purple-600 bg-purple-50", icon: Package, desc: "케이크를 정성껏 제작하고 있습니다." },
  ready: { label: "픽업 가능", color: "text-green-600 bg-green-50", icon: Truck, desc: "케이크 준비가 완료되었습니다. 매장으로 방문해주세요." },
  completed: { label: "완료", color: "text-gray-600 bg-gray-50", icon: Star, desc: "픽업이 완료되었습니다. 이용해주셔서 감사합니다!" },
  cancelled: { label: "취소", color: "text-red-600 bg-red-50", icon: AlertCircle, desc: "주문이 취소되었습니다." },
};

const STATUS_STEPS = ["pending", "confirmed", "producing", "ready", "completed"];

function OrderStatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="flex items-center">
      {STATUS_STEPS.filter((s) => s !== "cancelled").map((s, i) => {
        const config = STATUS_CONFIG[s];
        const done = i <= currentIdx;
        const active = i === currentIdx;

        return (
          <div key={s} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                } ${active ? "ring-4 ring-primary/20" : ""}`}
              >
                {done ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              </div>
              {i < STATUS_STEPS.length - 2 && (
                <div className={`flex-1 h-0.5 ${i < currentIdx ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
            <p className={`text-[9px] mt-1 text-center leading-tight ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {config.label}
            </p>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Status banner */}
      <div className={`flex items-center gap-2 px-4 py-2.5 ${config.color}`}>
        <StatusIcon size={14} />
        <span className="text-xs font-semibold">{config.label}</span>
        <span className="ml-auto text-xs opacity-70">#{order.order_number}</span>
      </div>

      {/* Timeline */}
      {order.status !== "cancelled" && (
        <div className="px-4 pt-3 pb-2">
          <OrderStatusTimeline status={order.status} />
          <p className="text-xs text-muted-foreground mt-3 text-center">{config.desc}</p>
        </div>
      )}

      <div className="p-4 border-t border-border">
        {/* Design info */}
        {design && (
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
              {design.thumbnail_url ? (
                <Image src={design.thumbnail_url} alt={design.title} fill className="object-cover" sizes="48px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🎂</div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{design.title}</p>
              <p className="text-xs text-muted-foreground">케이크 × {firstItem?.quantity}</p>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">픽업일</span>
            <span className="font-medium">{order.pickup_date} {order.pickup_time ?? ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">주문일</span>
            <span>{new Date(order.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
          {order.customer_message && (
            <div>
              <span className="text-muted-foreground">요청사항</span>
              <p className="text-xs mt-1 bg-muted rounded-lg p-2">{order.customer_message}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function TrackPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!phone || phone.length < 10) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await fetch(`/api/orders?phone=${phone}`);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎂</div>
          <h1 className="text-2xl font-bold">주문 조회</h1>
          <p className="text-sm text-muted-foreground mt-1">주문 시 입력한 휴대폰 번호를 입력해주세요</p>
        </div>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="w-full h-12 pl-10 pr-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={search}
            disabled={loading || phone.length < 10}
            className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            style={{ minHeight: "unset" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            조회
          </button>
        </div>

        <AnimatePresence>
          {searched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {orders && orders.length > 0 ? (
                orders.map((o) => <OrderCard key={o.id} order={o} />)
              ) : (
                <div className="text-center py-16">
                  <p className="text-3xl mb-3">🔍</p>
                  <p className="text-muted-foreground text-sm">주문 내역이 없습니다.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
