"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";
import { useSearchParams } from "next/navigation";

type ReviewTokenInfo = {
  order: {
    id: string;
    order_number: string;
    item_title: string;
    design_id: string | null;
  };
  expires_at: string;
  already_reviewed: boolean;
};

function ReviewFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    </main>
  );
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [info, setInfo] = useState<ReviewTokenInfo | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setError("리뷰 링크가 올바르지 않습니다.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/reviews?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "리뷰 링크를 확인할 수 없습니다.");
        if (!cancelled) {
          setInfo(data);
          setSubmitted(Boolean(data.already_reviewed));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "리뷰 링크를 확인할 수 없습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!info || submitting) return;
    if (content.trim().length > 1000) {
      setError("리뷰 내용은 1000자 이내로 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: info.order.id,
          review_token: token,
          rating,
          content: content.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "리뷰 등록에 실패했습니다.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "리뷰 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ReviewFallback />;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-primary">앙금앤케이크</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">픽업 후기</h1>
          {info && (
            <p className="mt-2 text-sm text-muted-foreground">
              {info.order.order_number} · {info.order.item_title}
            </p>
          )}
        </div>

        {error && !info ? (
          <section className="rounded-2xl border border-border bg-card p-5 text-center">
            <AlertCircle size={28} className="mx-auto text-destructive" />
            <p className="mt-3 text-sm font-medium text-foreground">{error}</p>
          </section>
        ) : submitted ? (
          <section className="rounded-2xl border border-border bg-card p-6 text-center">
            <CheckCircle2 size={34} className="mx-auto text-primary" />
            <h2 className="mt-4 text-lg font-bold text-foreground">후기가 등록되었습니다</h2>
            <p className="mt-2 text-sm text-muted-foreground">남겨주신 후기는 확인 후 매장 페이지에 반영됩니다.</p>
          </section>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5">
            <fieldset disabled={submitting} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground">만족도</label>
                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-primary transition hover:bg-muted"
                      aria-label={`${value}점`}
                    >
                      <Star size={22} fill={value <= rating ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="review-content" className="text-sm font-semibold text-foreground">
                  후기
                </label>
                <textarea
                  id="review-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={6}
                  maxLength={1000}
                  placeholder="맛, 디자인, 픽업 경험을 자유롭게 남겨주세요."
                  className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{content.length}/1000</p>
              </div>

              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                후기 등록
              </button>
            </fieldset>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewFallback />}>
      <ReviewContent />
    </Suspense>
  );
}
