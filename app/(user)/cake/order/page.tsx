"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
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

// ── Types ──────────────────────────────────────────────────────────────────
interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

// ── Step 1: 고객 정보 + OTP ────────────────────────────────────────────────
function StepCustomer({ onNext }: StepProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState<string | null>(null); // mock mode
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    if (!phone || phone.length < 10) return setError("올바른 전화번호를 입력해주세요.");
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/auth/phone/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "발송 실패");
      setOtpSent(true);
      if (data.code) setOtpCode(data.code); // SMS_MOCK_MODE
      setCooldown(60);
      const t = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) return setError("6자리 인증번호를 입력해주세요.");
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "인증 실패");
      setVerified(true);
      sessionStorage.setItem("order_customer", JSON.stringify({ name, phone, token: data.token }));
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
          {otpCode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-2 text-xs text-amber-700">
              <ShieldCheck size={14} />
              개발 모드 — 인증번호: <strong>{otpCode}</strong>
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
              onClick={verifyOtp}
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
          <Image src={previewUrl} alt="디자인 미리보기" fill className="object-cover" sizes="100vw" />
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
function StepRequests({ onNext, onBack }: StepProps) {
  const [message, setMessage] = useState("");
  const [allergy, setAllergy] = useState("");

  const handleNext = () => {
    sessionStorage.setItem("order_requests", JSON.stringify({ message, allergy }));
    onNext();
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <MessageSquare size={14} className="inline mr-1.5" />
          케이크 요청사항
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="글씨 문구, 색상 선호도, 특별 요청 등을 자유롭게 적어주세요."
          rows={4}
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">{message.length}/300자</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">알레르기 정보 (선택)</label>
        <input
          type="text"
          placeholder="예: 견과류, 유제품, 글루텐 등"
          value={allergy}
          onChange={(e) => setAllergy(e.target.value)}
          className="w-full h-12 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
        />
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

  const customer = JSON.parse(sessionStorage.getItem("order_customer") ?? "{}");
  const pickup = JSON.parse(sessionStorage.getItem("order_pickup") ?? "{}");
  const requests = JSON.parse(sessionStorage.getItem("order_requests") ?? "{}");

  const handleSubmit = async () => {
    setSubmitting(true);
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
          customer_message: requests.message,
          allergy: requests.allergy,
          design_id: designId,
          simulator_session_id: simulatorSessionId,
          order_type: "cake",
          delivery_method: "pickup",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderNumber(data.order_number);
      setDone(true);

      // 세션스토리지 정리
      sessionStorage.removeItem("order_customer");
      sessionStorage.removeItem("order_pickup");
      sessionStorage.removeItem("order_requests");

      setTimeout(() => router.push("/orders/track"), 3000);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold">주문 완료!</h3>
        <p className="text-muted-foreground text-sm text-center">
          주문번호 <strong className="text-foreground">{orderNumber}</strong>로<br />
          접수되었습니다. 잠시 후 주문 조회 페이지로 이동합니다.
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
        {requests.message && (
          <div>
            <span className="text-muted-foreground">요청사항</span>
            <p className="mt-1 text-foreground text-xs bg-background rounded-lg p-2">{requests.message}</p>
          </div>
        )}
        {requests.allergy && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">알레르기</span>
            <span className="text-sm">{requests.allergy}</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-xs text-primary space-y-1">
        <p className="font-medium flex items-center gap-1.5"><ShieldCheck size={13} /> 주문 안내</p>
        <p>• 주문 접수 후 카카오톡/문자로 확인 연락드립니다.</p>
        <p>• 정확한 금액은 디자인 상담 후 안내됩니다.</p>
        <p>• 보증금(30%)은 상담 후 계좌이체로 입금해주세요.</p>
      </div>

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
          {submitting ? "처리중..." : "주문 신청하기"}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
const STEPS = ["고객정보", "픽업일시", "디자인확인", "요청사항", "최종확인"];

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const designId = searchParams.get("designId") ?? undefined;
  const simulatorSessionId = searchParams.get("simulatorSessionId") ?? undefined;

  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => { if (step === 0) router.back(); else setStep((s) => s - 1); };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
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
                designTitle={designId ? "선택된 디자인" : undefined}
              />
            )}
            {step === 3 && <StepRequests onNext={next} onBack={back} />}
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
