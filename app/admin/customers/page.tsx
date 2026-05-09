"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Star, Phone, ShoppingBag } from "lucide-react";

const MOCK_CUSTOMERS = [
  { id: "1", name: "박민서", phone: "010-2345-6789", orderCount: 5, totalSpent: 450000, lastOrder: "2026-05-15", tags: ["웨딩", "생일"], memo: "하트 토퍼 선호", vip: true },
  { id: "2", name: "정하은", phone: "010-3456-7890", orderCount: 3, totalSpent: 225000, lastOrder: "2026-05-12", tags: ["생일", "레터링"], memo: "딸기 시트 선호", vip: false },
  { id: "3", name: "김지영", phone: "010-1234-5678", orderCount: 8, totalSpent: 720000, lastOrder: "2026-05-08", tags: ["앙금플라워", "생일"], memo: "", vip: true },
  { id: "4", name: "이도윤", phone: "010-4567-8901", orderCount: 2, totalSpent: 170000, lastOrder: "2026-05-08", tags: ["어버이날"], memo: "", vip: false },
  { id: "5", name: "강서윤", phone: "010-5678-9012", orderCount: 1, totalSpent: 95000, lastOrder: "2026-05-09", tags: ["돌잔치"], memo: "", vip: false },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [selected, setSelected] = useState<typeof MOCK_CUSTOMERS[0] | null>(null);

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    const matchSearch = !search || c.name.includes(search) || c.phone.includes(search);
    const matchVip = !vipOnly || c.vip;
    return matchSearch && matchVip;
  });

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
            placeholder="이름, 전화번호 검색"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          style={{ minHeight: "unset" }}
          onClick={() => setVipOnly(!vipOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${vipOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
        >
          <Star size={14} />
          VIP만
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {filtered.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ minHeight: "unset" }}
              onClick={() => setSelected(c)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${selected?.id === c.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{c.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.vip && <Star size={11} className="fill-amber-400 text-amber-400" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.orderCount}회 · ₩{c.totalSpent.toLocaleString()}</p>
              </div>
            </motion.button>
          ))}
        </div>

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
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{selected.name}</h2>
                    {selected.vip && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        <Star size={10} className="fill-amber-400" /> VIP
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Phone size={13} /> {selected.phone}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{selected.orderCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">총 주문</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">₩{(selected.totalSpent / 10000).toFixed(0)}만</p>
                  <p className="text-xs text-muted-foreground mt-0.5">누적 금액</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-foreground">{selected.lastOrder}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">마지막 주문</p>
                </div>
              </div>

              {selected.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">선호 카테고리</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.memo && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">메모</p>
                  <p className="text-sm text-amber-900">{selected.memo}</p>
                </div>
              )}
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
