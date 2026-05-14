"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingBag, CheckCircle2, Layers, Clock, TrendingUp,
  ArrowRight, Sparkles, Plus, Calendar, MessageSquare, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface StatsData {
  newOrderCount: number;
  activeOrderCount: number;
  todayPickupCount: number;
  todayPickups: {
    id: string;
    order_number: string;
    pickup_time: string | null;
    status: string;
    customers: { name: string } | null;
    order_items: { cake_designs: { title: string } | null }[];
  }[];
  weekData: { day: string; date: string; amount: number }[];
  totalWeekRevenue: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  producing: "bg-purple-100 text-purple-700",
  ready: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "대기", confirmed: "확정", producing: "제작중", ready: "픽업대기", completed: "완료",
};

function StatCard({
  icon: Icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-card rounded-2xl p-5 border border-border hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {sub && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <TrendingUp size={12} />
            {sub}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "안녕하세요" : "수고하셨어요";

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(console.error);
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, 사장님 ☀️
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {today.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })} · 오늘도 달콤한 하루 보내세요
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ minHeight: "unset" }}
        >
          <Plus size={16} />
          주문 보기
        </Link>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShoppingBag} label="신규 주문" value={stats ? `${stats.newOrderCount}건` : "—"} color="bg-amber-100 text-amber-600" delay={0.05} />
        <StatCard icon={CheckCircle2} label="진행 중 주문" value={stats ? `${stats.activeOrderCount}건` : "—"} color="bg-blue-100 text-blue-600" delay={0.1} />
        <StatCard icon={Layers} label="오늘 픽업" value={stats ? `${stats.todayPickupCount}건` : "—"} color="bg-purple-100 text-purple-600" delay={0.15} />
        <StatCard
          icon={Clock}
          label="이번 주 매출"
          value={stats ? `₩${(stats.totalWeekRevenue / 10000).toFixed(0)}만` : "—"}
          color="bg-green-100 text-green-600"
          delay={0.2}
        />
      </div>

      {/* Chart + Today schedule */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">이번 주 매출</h2>
              <p className="text-2xl font-bold text-foreground mt-1">
                ₩{(stats?.totalWeekRevenue ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          {stats?.weekData && stats.weekData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={stats.weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DE" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B6560" }} />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [`₩${Number(v).toLocaleString()}`, "매출"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #EDE6DE", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#D4A574"
                  strokeWidth={2.5}
                  fill="#D4A574"
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{ r: 5, fill: "#D4A574" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              데이터를 불러오는 중...
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              오늘의 픽업
            </h2>
            <Link href="/admin/calendar" className="text-xs text-primary hover:opacity-70 font-medium" style={{ minHeight: "unset" }}>
              전체 보기
            </Link>
          </div>
          {!stats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : stats.todayPickups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              오늘 픽업 예정이 없습니다
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.todayPickups.map((s) => {
                const title = s.order_items?.[0]?.cake_designs?.title ?? "케이크";
                return (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <div className="text-xs font-mono text-muted-foreground pt-0.5 w-10 flex-shrink-0">
                      {s.pickup_time?.slice(0, 5) ?? "--:--"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.customers?.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{title}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[s.status] ?? ""}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { icon: ShoppingBag, label: "신규 주문 처리", href: "/admin/orders", color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" },
          { icon: Sparkles, label: "디자인 관리", href: "/admin/designs", color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" },
          { icon: Calendar, label: "일정 관리", href: "/admin/calendar", color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
          { icon: MessageSquare, label: "고객 조회", href: "/admin/customers", color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex items-center gap-3 p-4 rounded-2xl border font-medium text-sm transition-colors ${action.color}`}
            style={{ minHeight: "unset" }}
          >
            <action.icon size={18} />
            {action.label}
          </Link>
        ))}
      </motion.div>

      {/* 고객 사이트 링크 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-accent/15 to-secondary/30 rounded-2xl border border-primary/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center">
            <ExternalLink size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">고객 주문 페이지</p>
            <p className="text-xs text-muted-foreground">고객이 직접 디자인을 탐색하고 주문하는 웹사이트</p>
          </div>
        </div>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:opacity-90 transition-opacity flex-shrink-0"
          style={{ minHeight: "unset" }}
        >
          미리보기
          <ArrowRight size={12} />
        </Link>
      </motion.div>
    </div>
  );
}
