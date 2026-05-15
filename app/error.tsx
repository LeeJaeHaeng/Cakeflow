"use client";

import { useEffect } from "react";
import { RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center text-foreground">
      <div className="w-full max-w-sm space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RefreshCcw size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold">페이지를 불러오지 못했습니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            잠시 후 다시 시도하거나 홈으로 돌아가 주세요.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={reset}
            className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            style={{ minHeight: "unset" }}
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold"
          >
            <Home size={16} />
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
