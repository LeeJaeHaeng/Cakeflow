"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Package,
  MessageSquare,
  ShoppingBag,
  RefreshCw,
  Loader2,
} from "lucide-react";

const TABS = [
  { key: "all",    label: "전체",      statuses: [] },
  { key: "new",    label: "신규",      statuses: ["pending"] },
  { key: "quote",  label: "협의필요",  statuses: ["pending"], quote: true },
  { key: "paid",   label: "결제완료",  statuses: ["confirmed"], paid: true },
  { key: "active", label: "제작중",    statuses: ["producing"] },
  { key: "ready",  label: "픽업대기",  statuses: ["ready"] },
  { key: "done",   label: "완료",      statuses: ["completed"] },
  { key: "cancel", label: "취소",      statuses: ["cancelled", "refunded"] },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  confirmed: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
  producing: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  ready:     { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400" },
  completed: { bg: "bg-gray-100",  text: "text-gray-600",   dot: "bg-gray-400" },
  cancelled: { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-400" },
  refunded:  { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-400" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "대기", confirmed: "확정", producing: "제작중",
  ready: "픽업대기", completed: "완료", cancelled: "취소", refunded: "환불",
};

type NextAction = { label: string; newStatus: string; icon: React.ComponentType<{ size?: number }>; color: string };

const NEXT_ACTIONS: Record<string, NextAction[]> = {
  pending: [
    { label: "예약 확정", newStatus: "confirmed", icon: CheckCircle, color: "bg-blue-600 text-white" },
    { label: "취소", newStatus: "cancelled", icon: XCircle, color: "bg-red-50 text-red-600" },
  ],
  confirmed: [{ label: "제작 시작", newStatus: "producing", icon: PlayCircle, color: "bg-purple-600 text-white" }],
  producing: [{ label: "픽업 준비 완료", newStatus: "ready", icon: Package, color: "bg-green-600 text-white" }],
  ready:     [{ label: "픽업 완료", newStatus: "completed", icon: CheckCircle, color: "bg-gray-700 text-white" }],
};

interface OrderCustomer { id: string; name: string; phone: string; vip_flag: boolean; memo: string | null; }
interface OrderDesign { title: string; thumbnail_url: string; }
interface OrderItem { id: string; quantity: number; unit_price: number; cake_designs: OrderDesign | null; }
interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  deposit_amount: number;
  payment_status: string;
  quote_status?: string;
  requires_consultation?: boolean;
  confirmed_price?: number | null;
  payment_due_at?: string | null;
  pickup_date: string;
  pickup_time: string | null;
  customer_message: string | null;
  admin_memo: string | null;
  created_at: string;
  customers: OrderCustomer | null;
  order_items: OrderItem[];
}

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (id: string, status: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const s = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
  const firstItem = order.order_items?.[0];
  const design = firstItem?.cake_designs;
  const customer = order.customers;

  const handleAction = async (newStatus: string) => {
    setSaving(true);
    try { await onStatusChange(order.id, newStatus); }
    finally { setSaving(false); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 썸네일 */}
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
          {design?.thumbnail_url ? (
            <Image src={design.thumbnail_url} alt={design.title} fill sizes="56px" className="object-cover" />
          ) : (
            <span className="text-2xl">🎂</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{customer?.name ?? "고객명 없음"}</span>
            <span className="text-xs text-muted-foreground font-mono">{order.order_number}</span>
            {order.requires_consultation && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">협의필요</span>
            )}
            {order.payment_status === "paid" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">결제완료</span>
            )}
            {order.payment_status === "unpaid" && order.deposit_amount === 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">미입금</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {design?.title ?? "케이크 주문"}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={11} /> {order.pickup_date}
            </span>
            {order.pickup_time && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} /> {order.pickup_time}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className="text-sm font-semibold">
            {order.total_price > 0 ? `₩${order.total_price.toLocaleString()}` : "가격 미정"}
          </span>
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">연락처</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Phone size={13} />
                    <a href={`tel:${customer?.phone}`} className="hover:underline">{customer?.phone}</a>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">예약금</p>
                  <p className="font-medium">
                    ₩{order.deposit_amount.toLocaleString()}
                    {" "}
                    {order.payment_status === "unpaid" ? "❌" : order.payment_status === "partial" ? "🔶" : "✅"}
                  </p>
                </div>
              </div>

              {order.customer_message && (
                <div className="bg-amber-50 rounded-xl p-3 text-sm">
                  <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                    <MessageSquare size={11} /> 고객 메시지
                  </p>
                  <p className="text-amber-900 whitespace-pre-wrap">{order.customer_message}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">견적 상태</p>
                  <p className="font-medium">{order.quote_status ?? "not_required"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">확정 금액</p>
                  <p className="font-medium">₩{Number(order.confirmed_price ?? order.total_price).toLocaleString()}</p>
                </div>
              </div>

              {order.admin_memo && (
                <div className="bg-muted rounded-xl p-3 text-sm">
                  <p className="text-xs text-muted-foreground font-medium mb-1">관리자 메모</p>
                  <p className="whitespace-pre-wrap">{order.admin_memo}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <a
                  href={`/admin/orders/${order.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-card border border-border text-foreground hover:bg-muted"
                >
                  상세 운영
                </a>
              </div>

              {NEXT_ACTIONS[order.status] && (
                <div className="flex gap-2 flex-wrap">
                  {NEXT_ACTIONS[order.status].map((action) => (
                    <button
                      key={action.newStatus}
                      style={{ minHeight: "unset" }}
                      disabled={saving}
                      onClick={(e) => { e.stopPropagation(); handleAction(action.newStatus); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${action.color}`}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <action.icon size={14} />}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("new");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    queueMicrotask(() => { void fetchOrders(); });
  }, [fetchOrders]);

  const tab = TABS.find((t) => t.key === activeTab)!;
  const filtered = orders.filter((o) => {
    if (tab.key === "quote") return Boolean(o.requires_consultation) || o.quote_status === "pending_quote";
    if (tab.key === "paid") return o.payment_status === "paid" && o.status === "confirmed";
    return tab.statuses.length === 0 || tab.statuses.includes(o.status);
  });

  const countByTab = (item: typeof TABS[number]) => {
    if (item.key === "quote") return orders.filter((o) => Boolean(o.requires_consultation) || o.quote_status === "pending_quote").length;
    if (item.key === "paid") return orders.filter((o) => o.payment_status === "paid" && o.status === "confirmed").length;
    return item.statuses.length === 0 ? orders.length : orders.filter((o) => item.statuses.includes(o.status)).length;
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchOrders();
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">주문 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">주문 상태를 확인하고 처리하세요</p>
        </div>
        <button
          style={{ minHeight: "unset" }}
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-sm hover:bg-muted/80 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-2xl overflow-x-auto">
        {TABS.map((tab) => {
          const count = countByTab(tab);
          return (
            <button
              key={tab.key}
              style={{ minHeight: "unset" }}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeTab === tab.key ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            placeholder="이름, 주문번호, 전화번호 검색 후 Enter"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          style={{ minHeight: "unset" }}
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Filter size={15} />
          검색
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-muted-foreground"
              >
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag size={28} className="text-muted-foreground" />
                </div>
                <p className="font-medium">해당 주문이 없습니다</p>
              </motion.div>
            ) : (
              filtered.map((order) => (
                <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
