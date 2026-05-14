"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Star, Phone, ShoppingBag, Loader2, CheckCircle2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  memo: string | null;
  allergy: string | null;
  vip_flag: boolean;
  total_orders: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  pickup_date: string;
  created_at: string;
  order_items: { cake_designs: { title: string } | null }[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "대기", confirmed: "확정", producing: "제작중",
  ready: "픽업대기", completed: "완료", cancelled: "취소",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  producing: "bg-purple-100 text-purple-700",
  ready: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<OrderSummary[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memo, setMemo] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (vipOnly) params.set("vip", "true");
      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, vipOnly]);

  useEffect(() => {
    queueMicrotask(() => { void fetchCustomers(); });
  }, [fetchCustomers]);

  const selectCustomer = async (c: Customer) => {
    setSelected(c);
    setMemo(c.memo ?? "");
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${c.id}`);
      const data = await res.json();
      setSelectedOrders(data.orders ?? []);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleVip = async () => {
    if (!selected) return;
    const newVip = !selected.vip_flag;
    await fetch(`/api/admin/customers/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vip_flag: newVip }),
    });
    setSelected({ ...selected, vip_flag: newVip });
    setCustomers((prev) => prev.map((c) => c.id === selected.id ? { ...c, vip_flag: newVip } : c));
  };

  const saveMemo = async () => {
    if (!selected) return;
    setSavingMemo(true);
    try {
      await fetch(`/api/admin/customers/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      setSelected({ ...selected, memo });
      setCustomers((prev) => prev.map((c) => c.id === selected.id ? { ...c, memo } : c));
    } finally {
      setSavingMemo(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">고객 관리</h1>
        <p className="text-muted-foreground text-sm mt-1">단골 고객과 주문 이력을 확인하세요</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
            placeholder="이름, 전화번호 검색"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          style={{ minHeight: "unset" }}
          onClick={() => setVipOnly(!vipOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            vipOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-card border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Star size={14} />
          VIP만
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 목록 */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">고객이 없습니다.</div>
          ) : (
            customers.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{ minHeight: "unset" }}
                onClick={() => selectCustomer(c)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                  selected?.id === c.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{c.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.vip_flag && <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.total_orders}회 · ₩{c.total_amount.toLocaleString()}
                  </p>
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* 상세 */}
        <div className="lg:col-span-2">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-5 space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{selected.name[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{selected.name}</h2>
                    <button
                      style={{ minHeight: "unset" }}
                      onClick={toggleVip}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        selected.vip_flag
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-muted text-muted-foreground border border-border hover:border-amber-300"
                      }`}
                    >
                      <Star size={10} className={selected.vip_flag ? "fill-amber-400" : ""} />
                      {selected.vip_flag ? "VIP" : "VIP 지정"}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Phone size={13} />
                    <a href={`tel:${selected.phone}`} className="hover:underline">{selected.phone}</a>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{selected.total_orders}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">총 주문</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">
                    {selected.total_amount >= 10000
                      ? `₩${(selected.total_amount / 10000).toFixed(0)}만`
                      : `₩${selected.total_amount.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">누적 금액</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold">
                    {new Date(selected.created_at).toLocaleDateString("ko-KR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">첫 방문</p>
                </div>
              </div>

              {selected.allergy && (
                <div className="bg-red-50 rounded-xl p-3 text-sm">
                  <p className="text-xs text-red-600 font-medium mb-1">⚠️ 알레르기 정보</p>
                  <p className="text-red-800">{selected.allergy}</p>
                </div>
              )}

              {/* 메모 */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">관리자 메모</p>
                <div className="flex gap-2">
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={2}
                    placeholder="고객 특이사항, 선호도 등 메모..."
                    className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <button
                    style={{ minHeight: "unset" }}
                    onClick={saveMemo}
                    disabled={savingMemo}
                    className="px-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {savingMemo ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  </button>
                </div>
              </div>

              {/* 주문 이력 */}
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">주문 이력</p>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                ) : selectedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">주문 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm">
                        <div>
                          <p className="font-medium text-xs font-mono">{o.order_number}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {o.order_items?.[0]?.cake_designs?.title ?? "케이크"} · {o.pickup_date}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {o.total_price > 0 ? `₩${o.total_price.toLocaleString()}` : "가격 미정"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm">고객을 선택하면 상세 정보가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
