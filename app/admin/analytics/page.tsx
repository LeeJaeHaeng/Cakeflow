"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, ShoppingBag, Users, Award, Loader2 } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalCount: number;
    completedCount: number;
    avgOrderPrice: number;
    newCustomers: number;
  };
  statusDist: Record<string, number>;
  dailyData: { date: string; revenue: number; count: number }[];
  topDesigns: { id: string; title: string; thumbnail_url: string | null; count: number }[];
  dayOfWeekData: { day: string; count: number }[];
}

const PERIOD_OPTIONS = [
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "3month", label: "최근 3개월" },
  { value: "all", label: "전체" },
];

const STATUS_KO: Record<string, string> = {
  pending: "대기", confirmed: "확정", producing: "제작중",
  ready: "픽업대기", completed: "완료",
};
const STATUS_COLORS_PIE = ["#D4A574", "#60A5FA", "#A78BFA", "#34D399", "#6B7280"];

function KpiCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: React.ComponentType<{ size?: number }>;
  label: string; value: string; sub?: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-card rounded-2xl border border-border p-5"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-green-600 font-medium mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics?period=${period}`);
        const nextData = await res.json();
        if (!cancelled) setData(nextData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => { cancelled = true; };
  }, [period]);

  // 일별 데이터를 차트용으로 변환 (최근 14일만)
  const chartDaily = data?.dailyData.slice(-14).map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  })) ?? [];

  // 상태 분포 파이 차트 데이터
  const pieData = Object.entries(data?.statusDist ?? {})
    .filter(([k]) => k !== "cancelled" && k !== "refunded")
    .map(([k, v]) => ({ name: STATUS_KO[k] ?? k, value: v }));

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">통계 분석</h1>
          <p className="text-muted-foreground text-sm mt-1">매출과 주문 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2 bg-muted p-1 rounded-xl">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              style={{ minHeight: "unset" }}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              icon={TrendingUp} label="총 매출" color="bg-amber-100 text-amber-600"
              value={`₩${(data!.summary.totalRevenue / 10000).toFixed(0)}만`}
              delay={0.05}
            />
            <KpiCard
              icon={ShoppingBag} label="총 주문" color="bg-blue-100 text-blue-600"
              value={`${data!.summary.totalCount}건`}
              delay={0.1}
            />
            <KpiCard
              icon={ShoppingBag} label="완료 주문" color="bg-green-100 text-green-600"
              value={`${data!.summary.completedCount}건`}
              delay={0.12}
            />
            <KpiCard
              icon={Award} label="평균 주문가" color="bg-purple-100 text-purple-600"
              value={data!.summary.avgOrderPrice > 0 ? `₩${data!.summary.avgOrderPrice.toLocaleString()}` : "—"}
              delay={0.15}
            />
            <KpiCard
              icon={Users} label="신규 고객" color="bg-pink-100 text-pink-600"
              value={`${data!.summary.newCustomers}명`}
              delay={0.18}
            />
          </div>

          {/* 차트 2열 */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* 일별 매출 바 차트 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-card rounded-2xl border border-border p-5"
            >
              <h2 className="font-semibold mb-4">일별 주문 수 (최근 14일)</h2>
              {chartDaily.every((d) => d.count === 0) ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  데이터 없음
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DE" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      formatter={(v) => [`${v}건`, "주문"]}
                      contentStyle={{ borderRadius: 10, border: "1px solid #EDE6DE", fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#D4A574" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* 주문 상태 파이 차트 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl border border-border p-5"
            >
              <h2 className="font-semibold mb-4">주문 상태 분포</h2>
              {pieData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  데이터 없음
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS_PIE[i % STATUS_COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* 요일별 + 인기 디자인 */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* 요일별 주문 패턴 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl border border-border p-5"
            >
              <h2 className="font-semibold mb-4">요일별 주문 패턴</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data?.dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DE" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [`${v}건`, "주문"]}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#E8B4B8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* 인기 디자인 TOP 5 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-card rounded-2xl border border-border p-5"
            >
              <h2 className="font-semibold mb-4">인기 디자인 TOP 5</h2>
              {data?.topDesigns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">주문 데이터 없음</p>
              ) : (
                <div className="space-y-3">
                  {data?.topDesigns.map((d, i) => (
                    <div key={d.id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? "bg-amber-100 text-amber-700" :
                        i === 1 ? "bg-gray-100 text-gray-600" :
                        i === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      {d.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-sm">🎂</div>
                      )}
                      <p className="flex-1 text-sm font-medium truncate">{d.title}</p>
                      <span className="text-xs font-semibold text-primary">{d.count}건</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
