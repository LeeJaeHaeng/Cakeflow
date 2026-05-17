"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

function PaymentCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number") ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
        <AlertCircle size={42} className="mx-auto text-primary" />
        <h1 className="mt-4 text-xl font-bold">온라인 결제 미사용</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          현재 주문은 결제 없이 접수되며, 사장님 확인 후 계좌이체 안내로 예약을 확정합니다.
        </p>
        <button
          onClick={() => router.replace(`/orders/track${orderNumber ? `?order_number=${encodeURIComponent(orderNumber)}` : ""}`)}
          className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          주문 조회로 이동
        </button>
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
