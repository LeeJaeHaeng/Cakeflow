"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, SlidersHorizontal, X, Sparkles, Search } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "birthday", label: "생일케이크" },
  { value: "first_birthday", label: "돌케이크" },
  { value: "anniversary", label: "기념일" },
  { value: "couple", label: "커플" },
  { value: "wedding", label: "웨딩" },
  { value: "parents_day", label: "어버이날" },
  { value: "rice_cake", label: "떡케이크" },
  { value: "flower", label: "플라워" },
  { value: "custom", label: "커스텀" },
];

const STYLES = ["심플", "화려한", "모던", "러블리", "내추럴", "빈티지"];
const PRICE_RANGES = [
  { label: "전체", min: 0, max: Infinity },
  { label: "~4만원", min: 0, max: 40000 },
  { label: "4~6만원", min: 40000, max: 60000 },
  { label: "6~8만원", min: 60000, max: 80000 },
  { label: "8만원~", min: 80000, max: Infinity },
];

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

function DesignCard({ design }: { design: CakeDesign }) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <Link href={`/cake/designs/${design.id}`}>
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
          {design.thumbnail_url ? (
            <Image
              src={design.thumbnail_url}
              alt={design.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🎂</div>
          )}
          {design.simulator_enabled && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
              <Sparkles size={9} />
              시뮬 가능
            </div>
          )}
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow transition-transform active:scale-90"
        style={{ minHeight: "unset" }}
      >
        <Heart
          size={15}
          className={liked ? "fill-[var(--color-cake-coral)] text-[var(--color-cake-coral)]" : "text-gray-400"}
        />
      </button>

      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium text-foreground truncate">{design.title}</p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-primary font-semibold">
            {design.price_from.toLocaleString()}원~
          </p>
          <p className="text-xs text-muted-foreground">주문 {design.order_count}건</p>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-2xl bg-muted" />
      <div className="mt-2 space-y-1.5">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3.5 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export default function DesignsPage() {
  const [designs, setDesigns] = useState<CakeDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [priceIdx, setPriceIdx] = useState(0);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/designs")
      .then((r) => r.json())
      .then((d) => setDesigns(d.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = designs.filter((d) => {
    if (category && !d.categories.includes(category)) return false;
    const range = PRICE_RANGES[priceIdx];
    if (d.price_from < range.min || d.price_from >= range.max) return false;
    if (selectedStyles.length > 0 && !selectedStyles.some((s) => d.style_tags.includes(s))) return false;
    if (search && !d.title.includes(search)) return false;
    return true;
  });

  const toggleStyle = useCallback((s: string) => {
    setSelectedStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }, []);

  const hasFilter = category || priceIdx > 0 || selectedStyles.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="디자인 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-medium transition-all ${
                category === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              style={{ minHeight: "unset" }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            onClick={() => setFilterOpen(true)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-all ${
              hasFilter
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
            style={{ minHeight: "unset" }}
          >
            <SlidersHorizontal size={12} />
            필터
            {hasFilter && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {(category ? 1 : 0) + (priceIdx > 0 ? 1 : 0) + selectedStyles.length}
              </span>
            )}
          </button>

          {/* Active price filter chip */}
          {priceIdx > 0 && (
            <div className="flex items-center gap-1 h-8 px-3 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {PRICE_RANGES[priceIdx].label}
              <button onClick={() => setPriceIdx(0)} style={{ minHeight: "unset" }}>
                <X size={11} />
              </button>
            </div>
          )}
          {selectedStyles.map((s) => (
            <div key={s} className="flex items-center gap-1 h-8 px-3 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
              {s}
              <button onClick={() => toggleStyle(s)} style={{ minHeight: "unset" }}>
                <X size={11} />
              </button>
            </div>
          ))}

          <p className="ml-auto text-xs text-muted-foreground flex-shrink-0">
            {filtered.length}개
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
          ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-4xl mb-3">🎂</p>
              <p className="text-muted-foreground text-sm">등록된 디자인이 없습니다.</p>
            </div>
          )
          : filtered.map((d) => <DesignCard key={d.id} design={d} />)
        }
      </div>

      {/* Filter bottom sheet */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setFilterOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">필터</h3>
                <button onClick={() => setFilterOpen(false)} style={{ minHeight: "unset" }}>
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Price */}
                <div>
                  <p className="text-sm font-medium mb-3">가격대</p>
                  <div className="flex flex-wrap gap-2">
                    {PRICE_RANGES.map((r, i) => (
                      <button
                        key={r.label}
                        onClick={() => setPriceIdx(i)}
                        className={`px-4 h-9 rounded-full text-sm font-medium border transition-all ${
                          priceIdx === i
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                        style={{ minHeight: "unset" }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <p className="text-sm font-medium mb-3">스타일</p>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStyle(s)}
                        className={`px-4 h-9 rounded-full text-sm font-medium border transition-all ${
                          selectedStyles.includes(s)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                        style={{ minHeight: "unset" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setPriceIdx(0); setSelectedStyles([]); }}
                  className="flex-1 h-12 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                  style={{ minHeight: "unset" }}
                >
                  초기화
                </button>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                  style={{ minHeight: "unset" }}
                >
                  적용하기
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
