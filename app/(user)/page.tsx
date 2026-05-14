"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  ArrowRight,
  Star,
  Heart,
  Cake,
  Package,
  Search,
  ChevronRight,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Sparkles,
} from "lucide-react";

function InstagramIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const FEATURED_DESIGNS = [
  { id: "1", title: "벚꽃 앙금플라워", category: "앙금플라워", tag: "생일", price: 65000, rating: 4.9, reviews: 48, img: "https://images.unsplash.com/photo-1729875749558-826bfeb4b1bb?w=400&h=400&fit=crop", simulable: true },
  { id: "2", title: "레터링 생크림 케이크", category: "레터링", tag: "기념일", price: 55000, rating: 4.8, reviews: 62, img: "https://images.unsplash.com/photo-1595859806061-8163067b3119?w=400&h=400&fit=crop", simulable: true },
  { id: "3", title: "클래식 앙금 떡케이크", category: "떡케이크", tag: "돌잔치", price: 75000, rating: 4.9, reviews: 35, img: "https://images.unsplash.com/photo-1762571807494-f67e8bf035d2?w=400&h=400&fit=crop", simulable: false },
  { id: "4", title: "플로럴 웨딩 케이크", category: "웨딩", tag: "기념일", price: 120000, rating: 5.0, reviews: 21, img: "https://images.unsplash.com/photo-1771738118209-fc3b654f431e?w=400&h=400&fit=crop", simulable: true },
];

const POPULAR_DESSERTS = [
  { id: "1", title: "앙금플라워 마카롱 세트", sub: "6개입", price: 24000, img: "https://images.unsplash.com/photo-1672518478295-0e684ead1483?w=300&h=300&fit=crop", stock: 18 },
  { id: "2", title: "버터 휘낭시에", sub: "6개입", price: 15000, img: "https://images.unsplash.com/photo-1638518724390-671c222c18bb?w=300&h=300&fit=crop", stock: 12 },
  { id: "3", title: "딸기 타르트", sub: "4인치", price: 28000, img: "https://images.unsplash.com/photo-1773907889788-ed2a37755d76?w=300&h=300&fit=crop", stock: 6 },
  { id: "4", title: "초코 브라우니 박스", sub: "4개입", price: 18000, img: "https://images.unsplash.com/photo-1623659945030-050946cf64ef?w=300&h=300&fit=crop", stock: 0 },
];

const REVIEWS = [
  { name: "김지영", date: "2주 전", rating: 5, text: "생일 케이크 너무 예뻤어요! 시뮬레이터로 미리 만들어보니까 실제랑 똑같이 나와서 깜짝 놀랐어요 🎂", tag: "생일" },
  { name: "이수민", date: "1개월 전", rating: 5, text: "앙금플라워가 너무 섬세하고 아름다워요. 선물했더니 받은 분이 감동받으셨답니다 ✨", tag: "선물" },
  { name: "박하은", date: "1개월 전", rating: 5, text: "돌잔치 떡케이크 주문했는데 퀄리티 최고! 다음에도 꼭 여기서 할 거예요", tag: "돌잔치" },
];

export default function CustomerHomePage() {
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ─── Hero Banner ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#C8534A] via-[#D4A574] to-[#E8B4B8] mx-4 mt-4 rounded-3xl">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1762571807494-f67e8bf035d2?w=800&h=500&fit=crop)", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="relative px-6 py-10 md:py-16 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white text-xs font-medium mb-4">
              <Sparkles size={12} />
              수제 케이크 · 디저트 전문
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3">
              특별한 날을<br />더 특별하게
            </h1>
            <p className="text-white/80 text-sm md:text-base mb-6 max-w-sm">
              앙금앤케이크에서 나만의 케이크를<br />시뮬레이터로 직접 만들고 회원가입 없이 주문하세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/cake/designs"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-primary rounded-2xl text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg"
                style={{ minHeight: "unset" }}
              >
                <Cake size={16} />
                케이크 디자인 보기
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/cake/simulator"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white/20 backdrop-blur text-white border border-white/40 rounded-2xl text-sm font-medium hover:bg-white/30 transition-colors"
                style={{ minHeight: "unset" }}
              >
                <Sparkles size={16} />
                시뮬레이터 체험하기
              </Link>
            </div>
          </motion.div>
        </div>
        <div className="absolute top-5 right-5 bg-white/90 backdrop-blur rounded-2xl p-3 text-center shadow-lg hidden sm:block">
          <div className="text-2xl font-bold text-primary">4.9</div>
          <div className="flex justify-center gap-0.5 my-1">
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={10} className="fill-amber-400 text-amber-400" />)}
          </div>
          <p className="text-xs text-muted-foreground">리뷰 270+</p>
        </div>
      </section>

      {/* ─── Quick Entry ─── */}
      <section className="px-4 mt-5 grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Link
            href="/cake/designs"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8B4B8]/30 to-[#C8534A]/20 border border-[#E8B4B8]/50 p-5 text-left hover:shadow-md transition-all group flex flex-col"
            style={{ minHeight: "unset" }}
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
              <Cake size={20} className="text-primary" />
            </div>
            <p className="font-semibold text-foreground text-sm">케이크</p>
            <p className="text-xs text-muted-foreground mt-0.5">앙금플라워 · 레터링 · 떡케이크</p>
            <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Link
            href="/dessert"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#D4A574]/20 to-[#E8A86B]/20 border border-[#D4A574]/40 p-5 text-left hover:shadow-md transition-all group flex flex-col"
            style={{ minHeight: "unset" }}
          >
            <div className="w-10 h-10 bg-[#D4A574]/20 rounded-xl flex items-center justify-center mb-3">
              <Package size={20} className="text-[#D4A574]" />
            </div>
            <p className="font-semibold text-foreground text-sm">디저트</p>
            <p className="text-xs text-muted-foreground mt-0.5">마카롱 · 휘낭시에 · 타르트</p>
            <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4A574] opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
      </section>

      {/* ─── Featured Designs ─── */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">추천 케이크 디자인</h2>
            <p className="text-xs text-muted-foreground mt-0.5">시뮬레이터로 직접 만들어보세요</p>
          </div>
          <Link href="/cake/designs" className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-70" style={{ minHeight: "unset" }}>
            전체 보기 <ChevronRight size={13} />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {FEATURED_DESIGNS.map((design, i) => (
            <motion.div
              key={design.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex-shrink-0 w-52 bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="relative">
                <Image
                  src={design.img}
                  alt={design.title}
                  width={208}
                  height={208}
                  className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  style={{ minHeight: "unset" }}
                  onClick={() => toggleLike(design.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                >
                  <Heart size={14} className={liked.has(design.id) ? "fill-primary text-primary" : "text-muted-foreground"} />
                </button>
                {design.simulable && (
                  <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-primary text-white rounded-lg text-xs font-medium">
                    <Sparkles size={10} /> 시뮬
                  </span>
                )}
                <span className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 backdrop-blur rounded-full text-xs font-medium text-foreground">
                  {design.tag}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground truncate">{design.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{design.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-primary">₩{design.price.toLocaleString()}~</p>
                  <div className="flex items-center gap-1">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs text-muted-foreground">{design.rating} ({design.reviews})</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Order CTA Banner ─── */}
      <section className="mt-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative rounded-3xl overflow-hidden p-6 md:p-8"
          style={{ background: "var(--sidebar)" }}
        >
          <div className="relative z-10">
            <p className="text-white/60 text-xs font-medium mb-1">회원가입 없이 · 3분 만에</p>
            <h3 className="text-white text-xl font-bold mb-1">지금 바로 주문할 수 있어요</h3>
            <p className="text-white/60 text-xs mb-5">전화번호 인증 하나로 간편하게 예약하세요</p>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/cake/designs"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ minHeight: "unset" }}
              >
                <Cake size={14} /> 케이크 주문
              </Link>
              <Link
                href="/orders/track"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 text-white/80 border border-white/20 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
                style={{ minHeight: "unset" }}
              >
                <Search size={14} /> 주문 조회
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Popular Desserts ─── */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">인기 디저트 상품</h2>
            <p className="text-xs text-muted-foreground mt-0.5">오늘 픽업 가능한 상품도 있어요</p>
          </div>
          <Link href="/dessert" className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-70" style={{ minHeight: "unset" }}>
            전체 보기 <ChevronRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {POPULAR_DESSERTS.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className={`bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${d.stock === 0 ? "opacity-60" : ""}`}
            >
              <div className="relative">
                <Image
                  src={d.img}
                  alt={d.title}
                  width={300}
                  height={144}
                  className="h-36 w-full object-cover"
                />
                {d.stock === 0 && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full font-medium">품절</span>
                  </div>
                )}
                {d.stock > 0 && d.stock <= 8 && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                    {d.stock}개 남음
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-foreground leading-tight">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.sub}</p>
                <p className="text-sm font-bold text-primary mt-1.5">₩{d.price.toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Reviews ─── */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">고객 리뷰</h2>
            <div className="flex items-center gap-1 mt-0.5">
              {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={11} className="fill-amber-400 text-amber-400" />)}
              <span className="text-xs text-muted-foreground ml-1">4.9 · 리뷰 270+</span>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {REVIEWS.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{r.name[0]}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.date}</p>
                </div>
                <span className="ml-auto px-2 py-0.5 bg-secondary rounded-full text-xs text-secondary-foreground">{r.tag}</span>
              </div>
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={11} className={s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Store Info ─── */}
      <section className="mt-8 px-4 pb-6">
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div
            className="h-40 bg-cover bg-center relative"
            style={{ backgroundImage: "url(https://images.unsplash.com/photo-1672749103540-6eb52167fecf?w=800&h=320&fit=crop)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <BrandLogo className="h-12 max-w-[210px] drop-shadow-md" />
              <p className="text-white/70 text-xs">경기 수원시 팔달구</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-primary" />
                <span>경기 수원시 팔달구<br />정자천로14번길 40</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Clock size={14} className="mt-0.5 flex-shrink-0 text-primary" />
                <span>화 ~ 일 10:00 ~ 18:00<br /><span className="text-destructive">월요일 휴무</span></span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href="tel:031-000-0000" className="flex items-center gap-1.5 px-3 py-2 bg-muted rounded-xl text-xs font-medium text-foreground hover:bg-border transition-colors" style={{ minHeight: "unset" }}>
                <Phone size={13} /> 전화 문의
              </a>
              <a href="https://pf.kakao.com/_hXAiK" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-[#FEE500] text-[#3A1D1D] rounded-xl text-xs font-medium hover:opacity-90 transition-opacity" style={{ minHeight: "unset" }}>
                <MessageCircle size={13} /> 카카오 문의
              </a>
              <a href="https://instagram.com/anggeumandcake" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-medium hover:opacity-90 transition-opacity" style={{ minHeight: "unset" }}>
                <InstagramIcon size={13} /> 인스타그램
              </a>
              <Link href="/store" className="flex items-center gap-1 px-3 py-2 border border-border rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors ml-auto" style={{ minHeight: "unset" }}>
                매장 상세 <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
