"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Heart,
  Share2,
  Sparkles,
  ShoppingBag,
  Star,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

interface Review {
  id: string;
  rating: number;
  content: string | null;
  image_url: string | null;
  created_at: string;
  customers: { name: string } | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} size={12} className={s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
      ))}
    </div>
  );
}

function ReviewsSection({ designId }: { designId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch(`/api/reviews?design_id=${designId}`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []));
  }, [designId]);

  if (reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-medium">고객 리뷰</p>
        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          {avg.toFixed(1)} ({reviews.length}건)
        </span>
      </div>
      <div className="space-y-3">
        {reviews.slice(0, 5).map((r) => (
          <div key={r.id} className="bg-muted/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={r.rating} />
              <span className="text-xs text-muted-foreground">
                {r.customers?.name ? `${r.customers.name[0]}${"*".repeat(r.customers.name.length - 1)}` : "고객"}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(r.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            {r.content && <p className="text-sm text-foreground leading-relaxed">{r.content}</p>}
            {r.image_url && (
              <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden">
                <Image src={r.image_url} alt="리뷰 이미지" fill className="object-cover" sizes="96px" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DesignImage {
  id: string;
  url: string;
  sort_order: number;
}

interface CakeDesign {
  id: string;
  title: string;
  description: string | null;
  categories: string[];
  style_tags: string[];
  color_tags: string[];
  price_from: number;
  thumbnail_url: string;
  simulator_enabled: boolean;
  order_count: number;
  view_count: number;
  design_images: DesignImage[];
}

const CATEGORY_LABELS: Record<string, string> = {
  birthday: "생일케이크",
  first_birthday: "돌케이크",
  anniversary: "기념일",
  couple: "커플",
  wedding: "웨딩",
  parents_day: "어버이날",
  rice_cake: "떡케이크",
  flower: "플라워",
  custom: "커스텀",
};

export default function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [design, setDesign] = useState<CakeDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/designs/${id}`)
      .then((r) => r.json())
      .then((d) => setDesign(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const allImages = design
    ? [
        { id: "thumb", url: design.thumbnail_url, sort_order: -1 },
        ...(design.design_images ?? []).sort((a, b) => a.sort_order - b.sort_order),
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="aspect-square bg-muted w-full" />
          <div className="p-4 space-y-3">
            <div className="h-6 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">디자인을 찾을 수 없습니다.</p>
        <Link href="/cake/designs" className="text-primary text-sm underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Image gallery */}
      <div className="relative">
        <div className="relative aspect-square bg-muted overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={imageIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <Image
                src={allImages[imageIdx]?.url}
                alt={design.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </motion.div>
          </AnimatePresence>

          {/* Image dots */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === imageIdx ? "bg-white w-4" : "bg-white/50"
                  }`}
                  style={{ minHeight: "unset" }}
                />
              ))}
            </div>
          )}

          {/* Nav arrows */}
          {imageIdx > 0 && (
            <button
              onClick={() => setImageIdx((p) => p - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
              style={{ minHeight: "unset" }}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {imageIdx < allImages.length - 1 && (
            <button
              onClick={() => setImageIdx((p) => p + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
              style={{ minHeight: "unset" }}
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
            style={{ minHeight: "unset" }}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
              style={{ minHeight: "unset" }}
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setLiked(!liked)}
              className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
              style={{ minHeight: "unset" }}
            >
              <Heart
                size={16}
                className={liked ? "fill-[var(--color-cake-coral)] text-[var(--color-cake-coral)]" : "text-white"}
              />
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        {allImages.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {allImages.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setImageIdx(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  i === imageIdx ? "border-primary" : "border-transparent opacity-60"
                }`}
                style={{ minHeight: "unset" }}
              >
                <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pt-4">
        {/* Category tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {design.categories.map((c) => (
            <span key={c} className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full font-medium">
              {CATEGORY_LABELS[c] ?? c}
            </span>
          ))}
        </div>

        <h1 className="text-xl font-bold text-foreground">{design.title}</h1>

        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-2xl font-bold text-primary">{design.price_from.toLocaleString()}원</span>
          <span className="text-sm text-muted-foreground">부터</span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>주문 {design.order_count}건</span>
          <span>·</span>
          <span>조회 {design.view_count}회</span>
          {design.simulator_enabled && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-primary font-medium">
                <Sparkles size={11} />
                시뮬레이터 지원
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {design.description && (
          <div className="mt-4 p-4 bg-muted/50 rounded-2xl">
            <p className="text-sm text-foreground leading-relaxed">{design.description}</p>
          </div>
        )}

        {/* Style tags */}
        {design.style_tags.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">스타일</p>
            <div className="flex flex-wrap gap-2">
              {design.style_tags.map((t) => (
                <span key={t} className="text-xs px-3 py-1.5 border border-border rounded-full text-muted-foreground">
                  #{t}
                </span>
              ))}
              {design.color_tags.map((t) => (
                <span key={t} className="text-xs px-3 py-1.5 border border-border rounded-full text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Order notice */}
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium">주문 안내</p>
          {[
            "최소 3일 전 예약 필수",
            "주문 후 디자인 변경은 2일 전까지 가능",
            "픽업 당일 취소/환불 불가",
            "알레르기 정보는 주문 시 별도 기재",
          ].map((notice) => (
            <div key={notice} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 size={14} className="text-primary flex-shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          ))}
        </div>

        {/* 리뷰 */}
        <ReviewsSection designId={design.id} />
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          {design.simulator_enabled && (
            <Link
              href={`/cake/simulator?designId=${design.id}`}
              className="flex-1 h-13 rounded-2xl bg-secondary text-secondary-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-secondary/80"
            >
              <Sparkles size={16} />
              시뮬레이터로 꾸미기
            </Link>
          )}
          <Link
            href={`/cake/order?designId=${design.id}`}
            className="flex-1 h-13 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ShoppingBag size={16} />
            주문하기
          </Link>
        </div>
      </div>
    </div>
  );
}
