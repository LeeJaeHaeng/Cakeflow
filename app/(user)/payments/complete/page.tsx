"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

function PaymentCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const orderNumber = searchParams.get("order_number") ?? "";
  const code = searchParams.get("code");
  const message = searchParams.get("message");
  const [status, setStatus] = useState<"loading" | "done" | "error">(code ? "error" : "loading");
  const [error, setError] = useState(message ?? "");

  useEffect(() => {
    if (code) return;
    if (!paymentId) {
      queueMicrotask(() => {
        setStatus("error");
        setError("결제 식별자가 없습니다.");
      });
      return;
    }

    fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "결제 검증 실패");
        setStatus("done");
        setTimeout(() => router.replace(`/orders/track?order_number=${encodeURIComponent(data.order_number ?? orderNumber)}`), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "결제 검증 실패");
      });
  }, [code, orderNumber, paymentId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 size={38} className="mx-auto animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-bold">결제 확인 중</h1>
            <p className="mt-2 text-sm text-muted-foreground">결제 결과를 안전하게 검증하고 있습니다.</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 size={42} className="mx-auto text-green-600" />
            <h1 className="mt-4 text-xl font-bold">결제 완료</h1>
            <p className="mt-2 text-sm text-muted-foreground">주문 조회 화면으로 이동합니다.</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle size={42} className="mx-auto text-red-600" />
            <h1 className="mt-4 text-xl font-bold">결제 확인 실패</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error || "결제 상태를 확인할 수 없습니다."}</p>
            <button
              onClick={() => router.replace(`/orders/track${orderNumber ? `?order_number=${encodeURIComponent(orderNumber)}` : ""}`)}
              className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              주문 조회로 이동
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PaymentCompleteContent />
    </Suspense>
  );
}
