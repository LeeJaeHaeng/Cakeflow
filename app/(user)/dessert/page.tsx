"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag, Phone, MessageCircle } from "lucide-react";
import { DEFAULT_SETTINGS, mergeShopSettings, type ShopSettings } from "@/lib/shop-settings";

interface DessertProduct {
  id: string;
  title: string;
  category: string | null;
  price: number;
  stock_count: number;
  thumbnail_url: string | null;
  description: string | null;
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

function ProductCard({ product }: { product: DessertProduct }) {
  const soldOut = product.stock_count === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
        {product.thumbnail_url ? (
          <Image
            src={product.thumbnail_url}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍪</div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm px-3 py-1 bg-black/60 rounded-full">품절</span>
          </div>
        )}
        {product.category && !soldOut && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            {product.category}
          </div>
        )}
      </div>

      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium text-foreground truncate">{product.title}</p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-primary font-semibold">₩{product.price.toLocaleString()}</p>
          {product.stock_count > 0 && product.stock_count <= 5 && (
            <p className="text-xs text-orange-500 font-medium">{product.stock_count}개 남음</p>
          )}
        </div>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function DessertPage() {
  const [products, setProducts] = useState<DessertProduct[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const shopInfo = settings.shop_info;

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(mergeShopSettings(d)))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">디저트</h1>
        <p className="text-sm text-muted-foreground mt-1">마카롱, 쿠키, 케이크팝 등 매일 직접 만드는 디저트</p>
      </div>

      {/* 주문 안내 배너 */}
      <div className="mx-4 mb-5 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
        <p className="text-sm font-medium text-foreground mb-1">💬 디저트 주문 방법</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          디저트는 카카오톡 채팅 또는 전화로 주문해주세요.<br />
          매일 한정 수량 제작되며, 당일 품절될 수 있습니다.
        </p>
        <div className="flex gap-2 mt-3">
          <a
            href={shopInfo.kakao_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#FEE500] text-[#3C1E1E] rounded-xl text-sm font-medium"
          >
            <MessageCircle size={16} />
            카카오 주문
          </a>
          <a
            href={`tel:${shopInfo.phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium"
          >
            <Phone size={16} />
            전화 주문
          </a>
        </div>
      </div>

      {/* 상품 그리드 */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : products.length === 0
          ? (
            <div className="col-span-full py-20 text-center">
              <div className="text-4xl mb-3">🍪</div>
              <p className="text-muted-foreground text-sm">현재 판매 중인 디저트가 없습니다.</p>
              <p className="text-xs text-muted-foreground mt-1">카카오톡으로 문의해주세요.</p>
            </div>
          )
          : products.map((p) => <ProductCard key={p.id} product={p} />)
        }
      </div>

      {/* Floating order button */}
      {products.length > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-0 right-0 px-4 flex justify-center">
          <a
            href={shopInfo.kakao_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3.5 bg-[#FEE500] text-[#3C1E1E] rounded-2xl text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity"
          >
            <ShoppingBag size={16} />
            카카오로 주문하기
          </a>
        </div>
      )}
    </div>
  );
}
