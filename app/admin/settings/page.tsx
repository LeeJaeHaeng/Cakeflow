"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, CheckCircle2, Clock, Package, MessageSquare } from "lucide-react";
import { DAY_KEYS, DAY_LABELS, DEFAULT_SETTINGS, mergeShopSettings, type DayHour, type ShopSettings } from "@/lib/shop-settings";

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-5 space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={16} className="text-primary" />
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d === "object" && !d.error) {
          setSettings(mergeShopSettings(d));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setHour = (day: string, field: keyof DayHour, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: { ...prev.operating_hours[day], [field]: value },
      },
    }));
  };

  const setSmsMsg = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      sms_messages: { ...prev.sms_messages, [key]: value },
    }));
  };

  const setShopInfo = (key: keyof ShopSettings["shop_info"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      shop_info: { ...prev.shop_info, [key]: value },
    }));
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">설정</h1>
          <p className="text-muted-foreground text-sm mt-1">운영시간, 용량, SMS 메시지를 설정하세요</p>
        </div>
        <button
          style={{ minHeight: "unset" }}
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? "저장됨!" : "저장"}
        </button>
      </div>

      {/* 운영 시간 */}
      <Section title="운영 시간" icon={Clock}>
        <div className="space-y-2">
          {DAY_KEYS.map((day) => {
            const h = settings.operating_hours[day] ?? { open: "10:00", close: "19:00", closed: false };
            return (
              <div key={day} className="flex items-center gap-3 text-sm">
                <span className="w-6 font-medium text-center">{DAY_LABELS[day]}</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) => setHour(day, "closed", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-muted-foreground text-xs">휴무</span>
                </label>
                {!h.closed && (
                  <>
                    <input
                      type="time"
                      value={h.open}
                      onChange={(e) => setHour(day, "open", e.target.value)}
                      className="border border-border rounded-lg px-2 py-1 text-xs bg-background"
                    />
                    <span className="text-muted-foreground text-xs">~</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={(e) => setHour(day, "close", e.target.value)}
                      className="border border-border rounded-lg px-2 py-1 text-xs bg-background"
                    />
                  </>
                )}
                {h.closed && <span className="text-xs text-red-500 font-medium">휴무일</span>}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 일일 주문 용량 */}
      <Section title="주문 용량" icon={Package}>
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">하루 최대 케이크 주문 수</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={50}
              value={settings.daily_capacity.max_orders}
              onChange={(e) => setSettings((prev) => ({
                ...prev,
                daily_capacity: { max_orders: Number(e.target.value) },
              }))}
              className="w-24 border border-border rounded-xl px-3 py-2 text-sm bg-background"
            />
            <span className="text-sm text-muted-foreground">개 / 일</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">캘린더의 &quot;용량&quot; 표시에 사용됩니다</p>
        </div>
      </Section>

      {/* 매장 정보 */}
      <Section title="매장 정보" icon={Package}>
        <div className="grid gap-3">
          {[
            { key: "name", label: "매장명", placeholder: "앙금앤케이크" },
            { key: "address", label: "주소", placeholder: "매장 주소" },
            { key: "phone", label: "전화번호", placeholder: "031-000-0000" },
            { key: "kakao_url", label: "카카오톡 URL", placeholder: "https://pf.kakao.com/..." },
            { key: "instagram_url", label: "인스타그램 URL", placeholder: "https://instagram.com/..." },
          ].map(({ key, label, placeholder }) => (
            <label key={key} className="block">
              <span className="text-xs text-muted-foreground font-medium block mb-1">{label}</span>
              <input
                type="text"
                value={settings.shop_info[key as keyof ShopSettings["shop_info"]] ?? ""}
                onChange={(e) => setShopInfo(key as keyof ShopSettings["shop_info"], e.target.value)}
                placeholder={placeholder}
                className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          ))}
        </div>
      </Section>

      {/* SMS 메시지 */}
      <Section title="SMS 알림 메시지" icon={MessageSquare}>
        <div className="space-y-3">
          {[
            { key: "confirmed", label: "예약 확정 시" },
            { key: "producing", label: "제작 시작 시" },
            { key: "ready", label: "픽업 준비 완료 시" },
            { key: "cancelled", label: "주문 취소 시" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground font-medium block mb-1">{label}</label>
              <textarea
                rows={2}
                value={settings.sms_messages[key] ?? ""}
                onChange={(e) => setSmsMsg(key, e.target.value)}
                className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
