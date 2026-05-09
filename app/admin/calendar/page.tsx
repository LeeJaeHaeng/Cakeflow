"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

const MOCK_EVENTS: Record<string, { name: string; item: string; time: string }[]> = {
  "2026-05-08": [{ name: "김지영", item: "앙금플라워 6호", time: "16:00" }],
  "2026-05-09": [{ name: "강서윤", item: "떡케이크 4호 (돌상)", time: "10:00" }],
  "2026-05-10": [{ name: "오준혁", item: "캐릭터 케이크 4호", time: "13:00" }],
  "2026-05-12": [{ name: "정하은", item: "레터링 케이크 5호", time: "15:30" }],
  "2026-05-15": [{ name: "박민서", item: "앙금플라워 웨딩 케이크", time: "14:00" }],
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 4, 9));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEvents = selectedKey ? (MOCK_EVENTS[selectedKey] ?? []) : [];

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

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const hasEvent = !!MOCK_EVENTS[key];
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={key}
                  style={{ minHeight: "unset" }}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-center h-10 rounded-xl text-sm transition-all
                    ${isSelected ? "bg-primary text-white font-medium" : isToday ? "bg-muted font-medium" : "hover:bg-muted text-foreground"}
                  `}
                >
                  {day.getDate()}
                  {hasEvent && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
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
            {selectedDate ? format(selectedDate, "M월 d일 (E)", { locale: ko }) : "날짜 선택"}
          </h2>
          {selectedEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>예약된 픽업이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="text-xs font-mono text-muted-foreground pt-0.5 w-10 flex-shrink-0">{ev.time}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{ev.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{ev.item}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">하루 최대 용량</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min((selectedEvents.length / 5) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">{selectedEvents.length}/5</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
