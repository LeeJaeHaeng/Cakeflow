"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as PortOne from "@portone/browser-sdk/v2";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  CalendarDays,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  Loader2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  DESIGN_SIZE_DETAILS,
  FILLING_OPTIONS,
  PRODUCT_OPTIONS,
  RICE_BASE_OPTIONS,
  RICE_SIZE_DETAILS,
  SHEET_FLAVORS,
  calculatePrice,
  formatWon,
  getDefaultProductForVariant,
  getProduct,
  getProductVariant,
  type CakeOrderDetails,
  type PaymentMethod,
  type ProductKey,
} from "@/lib/orders/pricing";

// ── Types ──────────────────────────────────────────────────────────────────
interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

type CakeFormVariant = "design" | "rice";

function isProductKey(value: string | null): value is ProductKey {
  return PRODUCT_OPTIONS.some((product) => product.key === value);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium mb-1.5">{children}</label>;
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
        selected ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-background text-foreground"
      }`}
      style={{ minHeight: "unset" }}
    >
      {children}
    </button>
  );
}

// ── Step 1: 고객 정보 + OTP ────────────────────────────────────────────────
function StepCustomer({ onNext }: StepProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length !== 11 || !digits.startsWith("010")) {
      return setError("010으로 시작하는 11자리 번호를 입력해주세요.");
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/auth/phone/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "발송 실패");
        return;
      }
      setOtpSent(true);
      setRequestId(data.request_id);
      if (data._mock_code) setMockCode(data._mock_code);
      setCooldown(60);
      const t = setInterval(() => setCooldown((c) => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      }), 1000);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const verifyOtpCode = async () => {
    if (!otp || otp.length !== 6) return setError("6자리 인증번호를 입력해주세요.");
    if (!requestId) return setError("인증 요청 정보가 없습니다. 다시 발송해주세요.");
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "인증 실패");
        return;
      }
      setVerified(true);
      const digits = phone.replace(/[^0-9]/g, "");
      const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
      sessionStorage.setItem("order_customer", JSON.stringify({ name, phone: formatted, token: data.token }));
    } catch {
      setError("인증에 실패했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">이름</label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={verified}
            className="w-full h-12 pl-10 pr-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">휴대폰 번호</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              disabled={verified}
              className="w-full h-12 pl-10 pr-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
          <button
            onClick={sendOtp}
            disabled={sending || cooldown > 0 || verified}
            className="h-12 px-4 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex-shrink-0 disabled:opacity-50 transition-opacity"
            style={{ minHeight: "unset" }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : cooldown > 0 ? `${cooldown}초` : otpSent ? "재발송" : "인증번호"}
          </button>
        </div>
      </div>

      {otpSent && (
        <div>
          {mockCode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-2 text-xs text-amber-700">
              <ShieldCheck size={14} />
              개발 모드 — 인증번호: <strong>{mockCode}</strong>
            </div>
          )}
          <label className="block text-sm font-medium mb-1.5">인증번호</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="6자리 입력"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              disabled={verified}
              className="flex-1 h-12 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 [appearance:textfield]"
            />
            <button
              onClick={verifyOtpCode}
              disabled={verifying || verified}
              className="h-12 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex-shrink-0 disabled:opacity-50"
              style={{ minHeight: "unset" }}
            >
              {verifying ? <Loader2 size={16} className="animate-spin" /> : verified ? <CheckCircle2 size={16} /> : "확인"}
            </button>
          </div>
          {verified && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5">
              <CheckCircle2 size={12} />
              인증 완료
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={onNext}
        disabled={!verified || !name.trim()}
        className="w-full h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
        style={{ minHeight: "unset" }}
      >
        다음
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Step 2: 픽업 날짜/시간 ─────────────────────────────────────────────────
function StepPickup({ onNext, onBack }: StepProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("14:00");
  const [persons, setPersons] = useState(1);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 3);
  const minDateStr = minDate.toISOString().split("T")[0];

  const handleNext = () => {
    sessionStorage.setItem("order_pickup", JSON.stringify({ date, time, persons }));
    onNext();
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">픽업 날짜</label>
        <div className="relative">
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            min={minDateStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-12 pl-10 pr-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <Clock size={11} />
          최소 3일 전 예약 필수
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">픽업 시간</label>
        <div className="grid grid-cols-4 gap-2">
          {["10:00", "12:00", "14:00", "16:00", "17:00", "18:00"].map((t) => (
            <button
              key={t}
              onClick={() => setTime(t)}
              className={`h-10 rounded-xl text-sm font-medium border transition-all ${
                time === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"
              }`}
              style={{ minHeight: "unset" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">인원수 (몇 명분)</label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPersons((p) => Math.max(1, p - 1))}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg"
            style={{ minHeight: "unset" }}
          >
            −
          </button>
          <span className="text-xl font-semibold w-8 text-center">{persons}</span>
          <button
            onClick={() => setPersons((p) => Math.min(50, p + 1))}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg"
            style={{ minHeight: "unset" }}
          >
            +
          </button>
          <span className="text-sm text-muted-foreground">명</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 h-13 rounded-2xl border border-border text-sm font-medium" style={{ minHeight: "unset" }}>
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={!date || !time}
          className="flex-2 flex-1 h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ minHeight: "unset" }}
        >
          다음 <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: 디자인 확인 ────────────────────────────────────────────────────
function StepDesignConfirm({
  onNext,
  onBack,
  previewUrl,
  designTitle,
}: StepProps & { previewUrl?: string; designTitle?: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">선택하신 디자인을 확인해주세요.</p>

      {previewUrl ? (
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="디자인 미리보기" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="aspect-square rounded-2xl bg-muted flex items-center justify-center">
          <span className="text-6xl">🎂</span>
        </div>
      )}

      {designTitle && (
        <div className="p-4 bg-secondary rounded-2xl">
          <p className="text-sm font-medium">{designTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">시뮬레이터 커스텀 디자인 포함</p>
        </div>
      )}

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 space-y-1">
        <p className="font-medium">안내사항</p>
        <p>• 최종 디자인은 주문 확인 후 사장님과 상담을 통해 조율됩니다.</p>
        <p>• 시뮬레이터 이미지는 참고용이며 실제 케이크와 다를 수 있습니다.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 h-13 rounded-2xl border border-border text-sm font-medium" style={{ minHeight: "unset" }}>
          이전
        </button>
        <button
          onClick={onNext}
          className="flex-1 h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          style={{ minHeight: "unset" }}
        >
          확인 <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Step 4: 요청사항 ───────────────────────────────────────────────────────
function StepRequests({
  onNext,
  onBack,
  variant,
  selectedProductKey,
}: StepProps & { variant: CakeFormVariant; selectedProductKey?: ProductKey }) {
  const saved = typeof window !== "undefined" ? sessionStorage.getItem("order_requests") : null;
  const initial = saved ? JSON.parse(saved) as CakeOrderDetails : null;
  const defaultProduct = selectedProductKey ?? initial?.product_key ?? getDefaultProductForVariant(variant);
  const productLocked = Boolean(selectedProductKey);

  const [details, setDetails] = useState<CakeOrderDetails>({
    form_variant: getProductVariant(defaultProduct),
    product_key: defaultProduct,
    size: initial?.size ?? "",
    sheet_flavor: initial?.sheet_flavor ?? "",
    rice_base: initial?.rice_base ?? "",
    rice_flower_style: initial?.rice_flower_style ?? "basic",
    number_count: initial?.number_count ?? 2,
    two_tier: initial?.two_tier ?? false,
    filling: initial?.filling ?? [],
    design_style: initial?.design_style ?? "",
    desired_color: initial?.desired_color ?? "",
    lettering: initial?.lettering ?? false,
    phrase: initial?.phrase ?? "",
    candle: initial?.candle ?? false,
    number_rice_cake: initial?.number_rice_cake ?? false,
    reference_note: initial?.reference_note ?? "",
    allergy: initial?.allergy ?? "",
    extra_request: initial?.extra_request ?? "",
  });
  const selectedProduct = getProduct(details.product_key);
  const selectedVariant = getProductVariant(details.product_key);
  const quote = calculatePrice(details);

  const update = (patch: Partial<CakeOrderDetails>) => {
    setDetails((prev) => ({ ...prev, ...patch, form_variant: getProductVariant(prev.product_key) }));
  };

  const selectProduct = (productKey: ProductKey) => {
    const nextVariant = getProductVariant(productKey);
    setDetails((prev) => ({
      ...prev,
      product_key: productKey,
      form_variant: nextVariant,
      size: "",
      sheet_flavor: "",
      rice_base: "",
      filling: [],
      rice_flower_style: productKey === "rice_flower" ? "basic" : undefined,
      number_count: productKey === "number_rice" ? 2 : undefined,
      lettering: false,
      two_tier: false,
      number_rice_cake: productKey === "number_rice",
    }));
  };

  const toggleFilling = (value: string) => {
    setDetails((prev) => {
      const current = prev.filling ?? [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, filling: next, form_variant: selectedVariant };
    });
  };

  const handleNext = () => {
    sessionStorage.setItem("order_requests", JSON.stringify({ ...details, form_variant: selectedVariant }));
    onNext();
  };


  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-primary">
          메뉴 선택
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          매장 메뉴 기준으로 기본금액과 확정 추가금을 먼저 계산합니다.
        </p>
      </div>

      <div>
        <FieldLabel>상품</FieldLabel>
        {productLocked ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">{selectedProduct.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedProduct.description}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-primary">{selectedProduct.priceLabel}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              시뮬레이터에서 선택한 메뉴입니다. 메뉴 변경은 시뮬레이터 첫 화면에서 다시 선택하세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {PRODUCT_OPTIONS.map((product) => (
              <button
                key={product.key}
                type="button"
                onClick={() => selectProduct(product.key)}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                  details.product_key === product.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                }`}
                style={{ minHeight: "unset" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{product.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-primary">{product.priceLabel}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProduct.key !== "dessert" && selectedProduct.key !== "tall_1_design" && selectedProduct.key !== "knife_flower" && (
        <div>
          <FieldLabel>사이즈</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {(selectedVariant === "rice" ? RICE_SIZE_DETAILS : DESIGN_SIZE_DETAILS).map((size) => (
              <OptionButton key={size} selected={details.size === size} onClick={() => update({ size })}>
                {size}
              </OptionButton>
            ))}
          </div>
        </div>
      )}

      {selectedProduct.key === "number_rice" && (
        <div>
          <FieldLabel>숫자 개수</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((count) => (
              <OptionButton key={count} selected={details.number_count === count} onClick={() => update({ number_count: count })}>
                {count}개
              </OptionButton>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">숫자 1개당 40,000원, 최대 3개까지 가능합니다.</p>
        </div>
      )}

      {selectedProduct.key === "rice_flower" && (
        <div>
          <FieldLabel>앙금플라워 스타일</FieldLabel>
          <div className="grid grid-cols-1 gap-2">
            <OptionButton selected={details.rice_flower_style === "basic"} onClick={() => update({ rice_flower_style: "basic" })}>
              기본 스타일 (+0원)
            </OptionButton>
            <OptionButton selected={details.rice_flower_style === "wreath"} onClick={() => update({ rice_flower_style: "wreath" })}>
              리스 스타일 (+7,000원)
            </OptionButton>
            <OptionButton selected={details.rice_flower_style === "blossom"} onClick={() => update({ rice_flower_style: "blossom" })}>
              블라썸 가득메움 스타일 (+7,000원)
            </OptionButton>
          </div>
        </div>
      )}

      {selectedVariant === "design" && selectedProduct.key !== "dessert" && (
        <div>
          <FieldLabel>빵맛</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {SHEET_FLAVORS.map((flavor) => (
              <OptionButton key={flavor} selected={details.sheet_flavor === flavor} onClick={() => update({ sheet_flavor: flavor })}>
                {flavor}
              </OptionButton>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">빵맛 추가금은 없습니다.</p>
        </div>
      )}

      {selectedVariant === "rice" && selectedProduct.key !== "number_rice" && selectedProduct.key !== "dessert" && (
        <>
          <div>
            <FieldLabel>떡 종류</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {RICE_BASE_OPTIONS.map((base) => (
                <OptionButton key={base} selected={details.rice_base === base} onClick={() => update({ rice_base: base })}>
                  {base}
                </OptionButton>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>케이크 필링</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {FILLING_OPTIONS.map((filling) => (
                <OptionButton key={filling} selected={(details.filling ?? []).includes(filling)} onClick={() => toggleFilling(filling)}>
                  {filling}
                </OptionButton>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedProduct.key !== "dessert" && (
        <div>
          <FieldLabel>원하시는 색감 / 디자인 설명</FieldLabel>
          <input
            type="text"
            value={details.desired_color ?? ""}
            onChange={(e) => update({ desired_color: e.target.value })}
            placeholder="예: 연핑크, 아이보리, 파스텔 보라"
            className="w-full h-12 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {selectedProduct.key === "design_cake" || selectedProduct.key === "knife_flower" ? (
        <div>
          <FieldLabel>그림/디자인 난이도 설명</FieldLabel>
          <textarea
            value={details.design_style ?? ""}
            onChange={(e) => update({ design_style: e.target.value })}
            placeholder="그림, 캐릭터, 색상 수, 참고 이미지 분위기 등을 적어주세요. 디자인에 따라 추가금이 발생합니다."
            rows={3}
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      ) : null}

      {selectedProduct.key === "figure_cake" && (
        <div>
          <FieldLabel>피규어 요청</FieldLabel>
          <textarea
            value={details.figure_request ?? ""}
            onChange={(e) => update({ figure_request: e.target.value })}
            placeholder="사용할 피규어 종류나 준비 여부를 적어주세요. 피규어 가격은 별도입니다."
            rows={3}
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      )}

      {selectedProduct.key === "tall_1_design" && (
        <div>
          <FieldLabel>샹드리에초 / 티아라 요청</FieldLabel>
          <input
            type="text"
            value={details.topper_request ?? ""}
            onChange={(e) => update({ topper_request: e.target.value })}
            placeholder="예: 티아라 올림 희망, 샹드리에초 상담"
            className="w-full h-12 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {selectedProduct.key !== "dessert" && (
        <div>
          <FieldLabel>문구</FieldLabel>
          <input
            type="text"
            value={details.phrase ?? ""}
            onChange={(e) => update({ phrase: e.target.value })}
            placeholder="예: 사랑합니다 / Happy Birthday"
            className="w-full h-12 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {selectedProduct.key === "rice_flower" && (
        <label className="flex items-center gap-2 rounded-xl bg-muted px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={details.lettering ?? false}
            onChange={(e) => update({ lettering: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          문구 추가 (+3,000원)
        </label>
      )}

      {selectedProduct.key === "figure_cake" || selectedProduct.key === "design_cake" ? (
        <label className="flex items-center gap-2 rounded-xl bg-muted px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={details.two_tier ?? false}
            onChange={(e) => update({ two_tier: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          2단 / 높이 추가 상담
        </label>
      ) : null}

      {selectedVariant === "rice" && selectedProduct.key !== "number_rice" && selectedProduct.key !== "dessert" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-xl bg-muted px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={details.candle ?? false}
              onChange={(e) => update({ candle: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            초 추가 희망
          </label>
        </div>
      )}

      <div>
        <FieldLabel>참고사진 / 설명</FieldLabel>
        <textarea
          value={details.reference_note ?? ""}
          onChange={(e) => update({ reference_note: e.target.value })}
          placeholder="보내주실 참고사진 설명이나 원하는 이미지 분위기를 적어주세요."
          rows={3}
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div>
        <FieldLabel>알레르기 여부</FieldLabel>
        <input
          type="text"
          value={details.allergy ?? ""}
          onChange={(e) => update({ allergy: e.target.value })}
          placeholder="예: 견과류 알레르기 있음"
          className="w-full h-12 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <FieldLabel>기타 요청사항</FieldLabel>
        <textarea
          value={details.extra_request ?? ""}
          onChange={(e) => update({ extra_request: e.target.value })}
          placeholder="픽업 시 유의사항, 색상 제외 요청, 상담이 필요한 내용을 적어주세요."
          rows={4}
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">예상 결제금액</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {quote.exact ? "선택 항목 기준 확정 금액입니다." : "확정 금액 + 상담 필요 항목이 있습니다."}
            </p>
          </div>
          <p className="text-lg font-bold text-primary">{formatWon(quote.total)}</p>
        </div>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>{quote.productTitle} 기본금액</span>
            <span>{formatWon(quote.basePrice)}</span>
          </div>
          {quote.addOns.map((item) => (
            <div key={item.label} className="flex justify-between text-primary">
              <span>{item.label}</span>
              <span>+{formatWon(item.amount)}</span>
            </div>
          ))}
          {quote.unknownItems.map((item) => (
            <div key={item} className="flex justify-between text-amber-700">
              <span>{item}</span>
              <span>상담 후 확정</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 h-13 rounded-2xl border border-border text-sm font-medium" style={{ minHeight: "unset" }}>
          이전
        </button>
        <button
          onClick={handleNext}
          className="flex-1 h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          style={{ minHeight: "unset" }}
        >
          다음 <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Step 5: 최종 확인 + 주문 ──────────────────────────────────────────────
function StepPayment({ onBack, designId, simulatorSessionId }: StepProps & { designId?: string; simulatorSessionId?: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [completionMode, setCompletionMode] = useState<"paid" | "consultation" | "bank">("consultation");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [errorMessage, setErrorMessage] = useState("");

  const customer = JSON.parse(sessionStorage.getItem("order_customer") ?? "{}");
  const pickup = JSON.parse(sessionStorage.getItem("order_pickup") ?? "{}");
  const requests = JSON.parse(sessionStorage.getItem("order_requests") ?? "{}") as CakeOrderDetails;
  const quote = calculatePrice(requests);
  const selectedProduct = getProduct(requests.product_key);
  const requiresConsultation = !quote.exact || paymentMethod === "bank_transfer";

  const detailRows = [
    ["상품", selectedProduct.title],
    ["사이즈", requests.size],
    ["빵맛", requests.sheet_flavor],
    ["떡 종류", requests.rice_base],
    ["숫자 개수", requests.product_key === "number_rice" ? `${requests.number_count ?? 2}개` : ""],
    ["앙금 스타일", requests.rice_flower_style === "wreath" ? "리스 스타일" : requests.rice_flower_style === "blossom" ? "블라썸 스타일" : ""],
    ["필링", requests.filling?.join(", ")],
    ["디자인 설명", requests.design_style],
    ["색감", requests.desired_color],
    ["문구", requests.phrase],
    ["문구 추가", requests.lettering ? "희망" : ""],
    ["토퍼 요청", requests.topper_request],
    ["피규어 요청", requests.figure_request],
    ["2단/높이 상담", requests.two_tier ? "희망" : ""],
    ["초 추가", requests.candle ? "희망" : ""],
    ["참고사진/설명", requests.reference_note],
    ["알레르기", requests.allergy],
    ["기타 요청", requests.extra_request],
  ].filter(([, value]) => Boolean(value));

  const clearOrderSession = () => {
    sessionStorage.removeItem("order_customer");
    sessionStorage.removeItem("order_pickup");
    sessionStorage.removeItem("order_requests");
  };

  const completePayment = async (paymentId: string) => {
    const completeRes = await fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error ?? "결제 검증 실패");
    return completeData;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_token: customer.token,
          pickup_date: pickup.date,
          pickup_time: pickup.time,
          persons: pickup.persons,
          customer_message: requests.extra_request,
          allergy: requests.allergy,
          cake_details: { ...requests, payment_method: requiresConsultation ? "bank_transfer" : paymentMethod },
          design_id: designId,
          simulator_session_id: simulatorSessionId,
          order_type: "cake",
          delivery_method: "pickup",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOrderNumber(data.order_number);

      if (data.payment_required && data.payment) {
        if (!data.payment.store_id || !data.payment.channel_key) {
          throw new Error("PortOne 환경변수가 설정되지 않았습니다. 관리자에게 문의해주세요.");
        }

        const response = await PortOne.requestPayment({
          storeId: data.payment.store_id,
          channelKey: data.payment.channel_key,
          paymentId: data.payment.payment_id,
          orderName: data.payment.order_name,
          totalAmount: data.payment.amount,
          currency: "CURRENCY_KRW",
          payMethod: "CARD",
          customer: {
            fullName: customer.name,
            phoneNumber: String(customer.phone ?? "").replace(/[^0-9]/g, ""),
          },
          redirectUrl: `${window.location.origin}/payments/complete?order_number=${encodeURIComponent(data.order_number)}&paymentId=${encodeURIComponent(data.payment.payment_id)}`,
        } as any);

        if (response?.code) {
          throw new Error(response.message ?? "결제가 취소되었거나 실패했습니다.");
        }

        await completePayment(data.payment.payment_id);
        setCompletionMode("paid");
      } else {
        setCompletionMode(paymentMethod === "bank_transfer" ? "bank" : "consultation");
      }

      setDone(true);
      clearOrderSession();
      setTimeout(() => router.push(`/orders/track?order_number=${encodeURIComponent(data.order_number)}`), 2500);
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const copy = completionMode === "paid"
      ? "결제가 완료되었습니다. 사장님 확인 후 예약 확정 알림을 보내드립니다."
      : completionMode === "bank"
      ? "주문서가 접수되었습니다. 사장님이 확인 후 계좌이체 입금 안내를 보내드립니다."
      : "상담 필요 항목이 있어 주문서만 먼저 접수되었습니다. 사장님이 카카오톡 또는 전화로 안내드립니다.";

    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold">주문 접수 완료</h3>
        <p className="text-muted-foreground text-sm text-center">
          주문번호 <strong className="text-foreground">{orderNumber}</strong>로<br />
          접수되었습니다. 잠시 후 주문 조회 페이지로 이동합니다.
        </p>
        <p className="rounded-2xl bg-primary/5 px-4 py-3 text-center text-xs leading-relaxed text-primary">
          {copy}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-4 bg-muted/50 rounded-2xl text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">고객명</span>
          <span className="font-medium">{customer.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">연락처</span>
          <span className="font-medium">{customer.phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">픽업일</span>
          <span className="font-medium">{pickup.date} {pickup.time}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">인원</span>
          <span className="font-medium">{pickup.persons}명분</span>
        </div>
      </div>

      <div className="space-y-2 p-4 bg-background border border-border rounded-2xl text-sm">
        <p className="font-semibold flex items-center gap-1.5">
          <MessageSquare size={14} /> 주문서 내용
        </p>
        {detailRows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[92px_1fr] gap-3 border-t border-border/60 pt-2 first:border-t-0 first:pt-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm whitespace-pre-wrap">{value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-background p-4">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <CreditCard size={14} /> 가격 확인
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{quote.productTitle} 기본금액</span>
            <span>{formatWon(quote.basePrice)}</span>
          </div>
          {quote.addOns.map((item) => (
            <div key={item.label} className="flex justify-between text-primary">
              <span>{item.label}</span>
              <span>+{formatWon(item.amount)}</span>
            </div>
          ))}
          {quote.unknownItems.map((item) => (
            <div key={item} className="flex justify-between text-amber-700">
              <span>{item}</span>
              <span>상담 후 확정</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold">현재 확정 가능 금액</span>
          <span className="text-xl font-bold text-primary">{formatWon(quote.total)}</span>
        </div>
        {!quote.exact && (
          <p className="text-xs text-amber-700">
            상담 필요 항목이 있어 지금은 결제하지 않습니다. 주문서 접수 후 사장님이 최종 금액을 안내합니다.
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-background p-4">
        <p className="text-sm font-semibold">예약 진행 방식</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!quote.exact}
            onClick={() => setPaymentMethod("card")}
            className={`rounded-xl border px-3 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
              paymentMethod === "card" && quote.exact ? "border-primary bg-primary/10 text-primary" : "border-border"
            }`}
            style={{ minHeight: "unset" }}
          >
            카드 100% 선결제
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("bank_transfer")}
            className={`rounded-xl border px-3 py-3 text-sm font-medium ${
              paymentMethod === "bank_transfer" || !quote.exact ? "border-primary bg-primary/10 text-primary" : "border-border"
            }`}
            style={{ minHeight: "unset" }}
          >
            상담/계좌이체
          </button>
        </div>
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-xs text-primary space-y-1">
        <p className="font-medium flex items-center gap-1.5"><ShieldCheck size={13} /> 실서비스 예약 안내</p>
        <p>• 확정 금액 주문은 PortOne 카드결제 완료 후 예약 확인 단계로 이동합니다.</p>
        <p>• 상담 필요 주문은 결제 없이 주문서만 발송하고 사장님 협의 후 계좌이체로 확정합니다.</p>
        <p>• 진행 상황은 카카오 알림톡 또는 문자로 안내됩니다.</p>
      </div>

      {errorMessage && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 h-13 rounded-2xl border border-border text-sm font-medium" style={{ minHeight: "unset" }}>
          이전
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ minHeight: "unset" }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          {submitting ? "처리중..." : requiresConsultation ? "주문서만 접수하기" : "카드결제 진행하기"}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
const STEPS = ["고객정보", "픽업일시", "디자인확인", "주문서작성", "최종확인"];

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const designId = searchParams.get("designId") ?? undefined;
  const simulatorSessionId = searchParams.get("simulatorSessionId") ?? undefined;
  const requestedCakeType = searchParams.get("cakeType");
  const requestedProductKey = searchParams.get("productKey");
  const selectedProductKey = isProductKey(requestedProductKey) ? requestedProductKey : undefined;

  const [step, setStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(() => {
    if (!simulatorSessionId || typeof window === "undefined") return undefined;
    return sessionStorage.getItem(`simulator_preview_${simulatorSessionId}`) ?? undefined;
  });
  const [designTitle, setDesignTitle] = useState<string | undefined>(undefined);
  const [designCategories, setDesignCategories] = useState<string[]>([]);

  const formVariant: CakeFormVariant = selectedProductKey
    ? getProductVariant(selectedProductKey)
    : requestedCakeType === "rice" || designCategories.some((category) => category === "rice_cake" || category === "flower")
    ? "rice"
    : "design";
  const selectedProductTitle = selectedProductKey ? getProduct(selectedProductKey).title : undefined;

  // 시뮬레이터 세션 미리보기 & 디자인 제목 로드
  useEffect(() => {
    if (simulatorSessionId) {
      const localPreview = sessionStorage.getItem(`simulator_preview_${simulatorSessionId}`);

      fetch(`/api/simulator/sessions?id=${simulatorSessionId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.preview_url) {
            setPreviewUrl(d.preview_url);
          } else if (localPreview) {
            setPreviewUrl(localPreview);
          }
        })
        .catch(() => {});
    }
    if (designId) {
      fetch(`/api/designs/${designId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.title) setDesignTitle(d.title);
          if (Array.isArray(d.categories)) setDesignCategories(d.categories);
        })
        .catch(() => {});
    }
  }, [simulatorSessionId, designId]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => { if (step === 0) router.back(); else setStep((s) => s - 1); };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-16 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={back} style={{ minHeight: "unset" }}>
            <ChevronLeft size={20} className="text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold">케이크 주문서</p>
            <p className="text-xs text-muted-foreground">{step + 1} / {STEPS.length} — {STEPS[step]}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step labels */}
      <div className="flex px-4 py-4 gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 text-center text-[10px] font-medium transition-colors ${
              i === step ? "text-primary" : i < step ? "text-primary/50" : "text-muted-foreground"
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1 text-[9px] ${
              i < step ? "bg-primary/20 text-primary" : i === step ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            {s}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && <StepCustomer onNext={next} />}
            {step === 1 && <StepPickup onNext={next} onBack={back} />}
            {step === 2 && (
              <StepDesignConfirm
                onNext={next}
                onBack={back}
                previewUrl={previewUrl}
                designTitle={designTitle ?? selectedProductTitle ?? (designId ? "선택된 디자인" : undefined)}
              />
            )}
            {step === 3 && (
              <StepRequests
                onNext={next}
                onBack={back}
                variant={formVariant}
                selectedProductKey={selectedProductKey}
              />
            )}
            {step === 4 && (
              <StepPayment
                onNext={next}
                onBack={back}
                designId={designId}
                simulatorSessionId={simulatorSessionId}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
