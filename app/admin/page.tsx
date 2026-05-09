"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  CheckCircle2,
  Layers,
  Clock,
  TrendingUp,
  Star,
  ArrowRight,
  Sparkles,
  Plus,
  Calendar,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const weekData = [
  { day: "월", amount: 120000 },
  { day: "화", amount: 185000 },
  { day: "수", amount: 95000 },
  { day: "목", amount: 210000 },
  { day: "금", amount: 275000 },
  { day: "토", amount: 340000 },
  { day: "일", amount: 185000 },
];

const todaySchedule = [
  { time: "10:00", name: "김지영", item: "앙금플라워 6호 (생일)", status: "ready", statusLabel: "픽업 대기" },
  { time: "14:00", name: "이수민", item: "캐릭터 레터링 5호", status: "producing", statusLabel: "제작 중" },
  { time: "16:30", name: "최유진", item: "떡케이크 4호 (돌)", status: "confirmed", statusLabel: "예약 확정" },
];

const recentOrders = [
  { id: "20260508-0042", name: "박민서", item: "앙금플라워 웨딩", date: "5월 15일", price: 120000, status: "confirmed", statusLabel: "예약확정", img: "https://images.unsplash.com/photo-1581524813206-e72bb3dd5178?w=80&h=80&fit=crop" },
  { id: "20260508-0041", name: "정하은", item: "레터링 케이크 5호", date: "5월 12일", price: 75000, status: "producing", statusLabel: "제작중", img: "https://images.unsplash.com/photo-1666005366664-0aed33bc5875?w=80&h=80&fit=crop" },
  { id: "20260508-0040", name: "김도현", item: "떡케이크 앙금 4호", date: "5월 10일", price: 65000, status: "pending", statusLabel: "대기중", img: "https://images.unsplash.com/photo-1702976513649-a7f85b10ac52?w=80&h=80&fit=crop" },
  { id: "20260508-0039", name: "이수진", item: "마카롱 세트 20개", date: "5월 9일", price: 48000, status: "completed", statusLabel: "완료", img: "https://images.unsplash.com/photo-1672518478295-0e684ead1483?w=80&h=80&fit=crop" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  producing: "bg-purple-100 text-purple-700",
  ready: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay = 0,
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
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "안녕하세요" : "수고하셨어요";

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
            {greeting}, 박서연 사장님 ☀️
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
          새 주문
        </Link>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShoppingBag} label="신규 주문" value="3건" color="bg-amber-100 text-amber-600" delay={0.05} />
        <StatCard icon={CheckCircle2} label="확정 주문" value="12건" sub="+2 오늘" color="bg-blue-100 text-blue-600" delay={0.1} />
        <StatCard icon={Layers} label="제작 중" value="5건" color="bg-purple-100 text-purple-600" delay={0.15} />
        <StatCard icon={Clock} label="오늘 픽업" value="2건" color="bg-green-100 text-green-600" delay={0.2} />
      </div>

      {/* Chart + Schedule */}
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
                ₩1,410,000
                <span className="text-sm font-normal text-green-600 ml-2">+18.4%</span>
              </p>
            </div>
            <div className="flex gap-1">
              {["주", "월", "년"].map((t) => (
                <button
                  key={t}
                  style={{ minHeight: "unset" }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${t === "주" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weekData}>
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
                stroke="#C8534A"
                strokeWidth={2.5}
                fill="#C8534A"
                fillOpacity={0.08}
                dot={false}
                activeDot={{ r: 5, fill: "#C8534A" }}
              />
            </AreaChart>
          </ResponsiveContainer>
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
              오늘의 일정
            </h2>
            <Link href="/admin/calendar" className="text-xs text-primary hover:opacity-70 font-medium" style={{ minHeight: "unset" }}>
              전체 보기
            </Link>
          </div>
          <div className="space-y-3">
            {todaySchedule.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-xs font-mono text-muted-foreground pt-0.5 w-10 flex-shrink-0">{s.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{s.item}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[s.status]}`}>
                  {s.statusLabel}
                </span>
              </motion.div>
            ))}
          </div>
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
          { icon: Sparkles, label: "SNS 캡션 만들기", href: "/admin/sns", color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" },
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

      {/* Customer site CTA */}
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

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl border border-border overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">최근 주문</h2>
          <Link href="/admin/orders" className="flex items-center gap-1 text-xs text-primary hover:opacity-70 font-medium" style={{ minHeight: "unset" }}>
            전체 보기 <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42 + i * 0.04 }}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <img src={order.img} alt={order.item} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{order.name}</p>
                  <p className="text-xs text-muted-foreground">{order.id}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{order.item} · {order.date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">₩{order.price.toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                  {order.statusLabel}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="bg-card rounded-2xl p-5 border border-border text-center">
          <div className="text-3xl font-bold text-foreground">4.9</div>
          <div className="flex justify-center gap-0.5 my-1">
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} className="fill-amber-400 text-amber-400" />)}
          </div>
          <p className="text-xs text-muted-foreground">네이버 플레이스 리뷰</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border text-center">
          <div className="text-3xl font-bold text-foreground">287</div>
          <p className="text-sm text-muted-foreground mt-1">이번 달 주문</p>
          <p className="text-xs text-green-600 mt-0.5">전월 대비 +23%</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border text-center">
          <div className="text-3xl font-bold text-foreground">68%</div>
          <p className="text-sm text-muted-foreground mt-1">시뮬레이터 사용률</p>
          <p className="text-xs text-green-600 mt-0.5">목표치 50% 초과 달성</p>
        </div>
      </motion.div>
    </div>
  );
}
