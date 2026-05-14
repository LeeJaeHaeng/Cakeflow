"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Loader2, Package, Edit2, Trash2,
  ToggleLeft, ToggleRight, Upload,
} from "lucide-react";

interface DessertProduct {
  id: string;
  title: string;
  category: string | null;
  price: number;
  cost: number | null;
  stock_count: number;
  thumbnail_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

const CATEGORIES = ["마카롱", "쿠키", "케이크팝", "디저트박스", "기타"];


function ProductForm({
  product,
  onSaved,
  onClose,
}: {
  product?: DessertProduct;
  onSaved: (p: DessertProduct) => void;
  onClose: () => void;
}) {
  const isEdit = !!product;
  const [title, setTitle] = useState(product?.title ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [cost, setCost] = useState(String(product?.cost ?? ""));
  const [stock, setStock] = useState(String(product?.stock_count ?? 0));
  const [description, setDescription] = useState(product?.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(product?.thumbnail_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "cake-designs");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { setError("업로드 실패"); return; }
      const { url } = await res.json();
      setThumbnailUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) { setError("제목과 가격은 필수입니다."); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        title: title.trim(),
        category: category || null,
        price: Number(price),
        cost: cost ? Number(cost) : null,
        stock_count: Number(stock),
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
      };
      const url = isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "저장 실패"); return; }
      const data = await res.json();
      onSaved(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">{isEdit ? "상품 수정" : "상품 등록"}</h2>
          <button style={{ minHeight: "unset" }} onClick={onClose}>
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 썸네일 */}
          <div>
            <label className="block text-sm font-medium mb-2">상품 이미지</label>
            <div className="flex items-center gap-3">
              {thumbnailUrl ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-xl">
                  <Image src={thumbnailUrl} alt="썸네일" fill sizes="64px" className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <Package size={20} className="text-muted-foreground" />
                </div>
              )}
              <label className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                이미지 업로드
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">상품명 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="마카롱 1개"
              className="w-full h-11 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{ minHeight: "unset" }}
                  onClick={() => setCategory(c === category ? "" : c)}
                  className={`px-3 h-8 rounded-full text-xs font-medium border transition-all ${
                    category === c ? "border-primary bg-primary text-white" : "border-border text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">판매가 (원) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="2500"
                className="w-full h-11 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">원가 (원)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="선택"
                className="w-full h-11 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">재고 수량</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              min={0}
              className="w-full h-11 px-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">상품 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="상품 설명을 입력하세요"
              className="w-full px-4 py-3 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              style={{ minHeight: "unset" }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ minHeight: "unset" }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEdit ? "수정 완료" : "등록하기"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<DessertProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DessertProduct | undefined>(undefined);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products?all=true");
      const data = await res.json();
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void fetchProducts(); });
  }, [fetchProducts]);

  const handleSaved = (p: DessertProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [p, ...prev];
    });
    setFormOpen(false);
    setEditTarget(undefined);
  };

  const toggleStatus = async (p: DessertProduct) => {
    const newStatus = p.status === "active" ? "paused" : "active";
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, status: newStatus } : x));
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("상품을 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">디저트 상품</h1>
          <p className="text-muted-foreground text-sm mt-1">마카롱, 쿠키 등 디저트 상품을 관리하세요</p>
        </div>
        <button
          style={{ minHeight: "unset" }}
          onClick={() => { setEditTarget(undefined); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          상품 등록
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">등록된 상품이 없습니다.</p>
          <button
            style={{ minHeight: "unset" }}
            onClick={() => { setEditTarget(undefined); setFormOpen(true); }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            첫 상품 등록하기
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-card rounded-2xl border overflow-hidden transition-all ${
                p.status === "paused" ? "border-border opacity-60" : "border-border"
              }`}
            >
              <div className="relative aspect-square bg-muted">
                {p.thumbnail_url ? (
                  <Image src={p.thumbnail_url} alt={p.title} fill sizes="(max-width: 640px) 100vw, 260px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍪</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    style={{ minHeight: "unset" }}
                    onClick={() => toggleStatus(p)}
                    className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
                  >
                    {p.status === "active"
                      ? <ToggleRight size={16} className="text-green-600" />
                      : <ToggleLeft size={16} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {p.category && (
                      <span className="text-[10px] text-muted-foreground font-medium">{p.category}</span>
                    )}
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">
                      ₩{p.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">재고 {p.stock_count}개</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    style={{ minHeight: "unset" }}
                    onClick={() => { setEditTarget(p); setFormOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    <Edit2 size={12} />
                    수정
                  </button>
                  <button
                    style={{ minHeight: "unset" }}
                    onClick={() => deleteProduct(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} />
                    삭제
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <ProductForm
            product={editTarget}
            onSaved={handleSaved}
            onClose={() => { setFormOpen(false); setEditTarget(undefined); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
