"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, addMonths, subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";

interface PickupOrder {
  id: string;
  order_number: string;
  pickup_time: string | null;
  status: string;
  customers: { name: string; phone: string } | null;
  order_items: { cake_designs: { title: string } | null }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  producing: "bg-purple-100 text-purple-700",
  ready:     "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "대기", confirmed: "확정", producing: "제작중",
  ready: "픽업대기", completed: "완료", cancelled: "취소",
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allOrders, setAllOrders] = useState<(PickupOrder & { pickup_date: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  // 해당 월 주문 로드
  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      const from = format(monthStart, "yyyy-MM-dd");
      const to = format(monthEnd, "yyyy-MM-dd");
      try {
        const res = await fetch(`/api/admin/orders?limit=500`);
        const data = await res.json();
        const orders = (data.orders ?? []) as (PickupOrder & { pickup_date: string })[];
        const filtered = orders.filter((o) => o.pickup_date >= from && o.pickup_date <= to);
        if (!cancelled) setAllOrders(filtered);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrders();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth.getFullYear(), currentMonth.getMonth()]);

  const ordersForDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return allOrders.filter((o) => o.pickup_date === key && o.status !== "cancelled");
  };

  const selectedOrders = ordersForDate(selectedDate);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">일정 캘린더</h1>
        <p className="text-muted-foreground text-sm mt-1">픽업 일정과 주문 현황을 확인하세요</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </h2>
            <div className="flex gap-1">
              <button
                style={{ minHeight: "unset" }}
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                style={{ minHeight: "unset" }}
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day) => {
                  const dayOrders = ordersForDate(day);
                  const hasEvent = dayOrders.length > 0;
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={day.toISOString()}
                      style={{ minHeight: "unset" }}
                      onClick={() => setSelectedDate(day)}
                      className={`relative flex flex-col items-center justify-center h-10 rounded-xl text-sm transition-all
                        ${isSelected ? "bg-primary text-white font-medium" :
                          isToday ? "bg-muted font-medium" :
                          "hover:bg-muted text-foreground"}
                      `}
                    >
                      {day.getDate()}
                      {hasEvent && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayOrders.slice(0, 3).map((_, i) => (
                            <span key={i} className="w-1 h-1 rounded-full bg-primary" />
                          ))}
                        </span>
                      )}
                      {hasEvent && isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/80">
                          {dayOrders.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* Day detail */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-primary" />
            {format(selectedDate, "M월 d일 (E)", { locale: ko })}
          </h2>

          {selectedOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>예약된 픽업이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedOrders
                .sort((a, b) => (a.pickup_time ?? "").localeCompare(b.pickup_time ?? ""))
                .map((o) => {
                  const customer = o.customers;
                  const title = o.order_items?.[0]?.cake_designs?.title ?? "케이크";
                  return (
                    <div key={o.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="text-xs font-mono text-muted-foreground pt-0.5 w-10 flex-shrink-0">
                        {o.pickup_time?.slice(0, 5) ?? "--:--"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{customer?.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{title}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">오늘 용량</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((selectedOrders.length / 8) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">{selectedOrders.length}/8</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
