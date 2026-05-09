"use client";

import { useState } from "react";
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
  Download,
  MessageSquare,
  ShoppingBag,
} from "lucide-react";

const TABS = [
  { key: "new", label: "신규", count: 3 },
  { key: "active", label: "진행중", count: 8 },
  { key: "ready", label: "픽업대기", count: 2 },
  { key: "done", label: "완료", count: 0 },
  { key: "cancel", label: "취소/환불", count: 0 },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  producing: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  ready: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" },
  completed: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "대기", confirmed: "확정", producing: "제작중",
  ready: "픽업대기", completed: "완료", cancelled: "취소",
};

type Order = {
  id: string; name: string; phone: string;
  item: string; pickupDate: string; pickupTime: string;
  price: number; deposit: number; paid: boolean; status: string;
  msg: string; memo: string; img: string; tab: string;
};

const INITIAL_ORDERS: Order[] = [
  { id: "20260508-0042", name: "박민서", phone: "010-2345-6789", item: "앙금플라워 웨딩 케이크 6호", pickupDate: "2026-05-15", pickupTime: "14:00", price: 120000, deposit: 50000, paid: true, status: "confirmed", msg: "하트 토퍼 추가해주세요", memo: "", img: "https://images.unsplash.com/photo-1581524813206-e72bb3dd5178?w=80&h=80&fit=crop", tab: "active" },
  { id: "20260508-0041", name: "정하은", phone: "010-3456-7890", item: "레터링 케이크 5호 (생일)", pickupDate: "2026-05-12", pickupTime: "15:30", price: 75000, deposit: 30000, paid: true, status: "producing", msg: "\"생일 축하해 하은아\" 레터링 부탁드려요", memo: "딸기 시트 추가", img: "https://images.unsplash.com/photo-1666005366664-0aed33bc5875?w=80&h=80&fit=crop", tab: "active" },
  { id: "20260508-0043", name: "이도윤", phone: "010-4567-8901", item: "앙금플라워 5호 (어버이날)", pickupDate: "2026-05-08", pickupTime: "11:00", price: 85000, deposit: 0, paid: false, status: "pending", msg: "포장 예쁘게 부탁드려요", memo: "", img: "https://images.unsplash.com/photo-1702976513649-a7f85b10ac52?w=80&h=80&fit=crop", tab: "new" },
  { id: "20260508-0044", name: "강서윤", phone: "010-5678-9012", item: "떡케이크 4호 (돌상)", pickupDate: "2026-05-09", pickupTime: "10:00", price: 95000, deposit: 0, paid: false, status: "pending", msg: "1살 생일, 돌상용 케이크입니다", memo: "", img: "https://images.unsplash.com/photo-1671762520625-c4835a2ac71c?w=80&h=80&fit=crop", tab: "new" },
  { id: "20260508-0045", name: "오준혁", phone: "010-6789-0123", item: "캐릭터 케이크 4호", pickupDate: "2026-05-10", pickupTime: "13:00", price: 88000, deposit: 0, paid: false, status: "pending", msg: "포켓몬 캐릭터 원해요", memo: "", img: "https://images.unsplash.com/photo-1666005366664-0aed33bc5875?w=80&h=80&fit=crop", tab: "new" },
  { id: "20260508-0038", name: "김지영", phone: "010-1234-5678", item: "앙금플라워 6호", pickupDate: "2026-05-08", pickupTime: "16:00", price: 105000, deposit: 50000, paid: true, status: "ready", msg: "", memo: "제작 완료, 냉장 보관 중", img: "https://images.unsplash.com/photo-1581524813206-e72bb3dd5178?w=80&h=80&fit=crop", tab: "ready" },
];

type NextAction = { label: string; newStatus: string; icon: React.ComponentType<{ size?: number }>; color: string };

const NEXT_ACTIONS: Record<string, NextAction[]> = {
  pending: [
    { label: "예약 확정", newStatus: "confirmed", icon: CheckCircle, color: "bg-blue-600 text-white" },
    { label: "취소", newStatus: "cancelled", icon: XCircle, color: "bg-red-50 text-red-600" },
  ],
  confirmed: [{ label: "제작 시작", newStatus: "producing", icon: PlayCircle, color: "bg-purple-600 text-white" }],
  producing: [{ label: "픽업 준비 완료", newStatus: "ready", icon: Package, color: "bg-green-600 text-white" }],
  ready: [{ label: "픽업 완료", newStatus: "completed", icon: CheckCircle, color: "bg-gray-700 text-white" }],
};

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_STYLES[order.status];

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
        <img src={order.img} alt={order.item} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{order.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{order.id}</span>
            {!order.paid && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">미입금</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{order.item}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={11} /> {order.pickupDate}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} /> {order.pickupTime}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {STATUS_LABELS[order.status]}
          </span>
          <span className="text-sm font-semibold">₩{order.price.toLocaleString()}</span>
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
                  <p className="flex items-center gap-1.5 font-medium"><Phone size={13} /> {order.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">결제 현황</p>
                  <p className="font-medium">예약금 ₩{order.deposit.toLocaleString()} {order.paid ? "✅" : "❌"}</p>
                </div>
              </div>
              {order.msg && (
                <div className="bg-amber-50 rounded-xl p-3 text-sm">
                  <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1"><MessageSquare size={11} /> 고객 메시지</p>
                  <p className="text-amber-900">{order.msg}</p>
                </div>
              )}
              {NEXT_ACTIONS[order.status] && (
                <div className="flex gap-2 flex-wrap">
                  {NEXT_ACTIONS[order.status].map((action) => (
                    <button
                      key={action.newStatus}
                      style={{ minHeight: "unset" }}
                      onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, action.newStatus); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 ${action.color}`}
                    >
                      <action.icon size={14} />
                      {action.label}
                    </button>
                  ))}
                  <button
                    style={{ minHeight: "unset" }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    <Download size={14} />
                    작업지시서
                  </button>
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
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  const filtered = orders.filter((o) => {
    const matchTab =
      activeTab === "new" ? o.tab === "new" :
      activeTab === "active" ? o.tab === "active" :
      activeTab === "ready" ? o.tab === "ready" :
      activeTab === "done" ? o.status === "completed" :
      activeTab === "cancel" ? o.status === "cancelled" : true;
    const matchSearch = !search || o.name.includes(search) || o.id.includes(search) || o.item.includes(search);
    return matchTab && matchSearch;
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const newTab =
          newStatus === "pending" ? "new" :
          newStatus === "confirmed" || newStatus === "producing" ? "active" :
          newStatus === "ready" ? "ready" : "done";
        return { ...o, status: newStatus, tab: newTab };
      })
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">주문 관리</h1>
        <p className="text-muted-foreground text-sm mt-1">주문 상태를 확인하고 처리하세요</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-2xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            style={{ minHeight: "unset" }}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === tab.key ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 주문번호, 상품명 검색"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          style={{ minHeight: "unset" }}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Filter size={15} />
          필터
        </button>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
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
      </div>
    </div>
  );
}
