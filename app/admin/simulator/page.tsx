"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cake, CheckCircle2, ImagePlus, Loader2, Plus, Save, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import {
  DEFAULT_SIMULATOR_EXAMPLES,
  PRODUCT_OPTIONS,
  formatWon,
  normalizeProductOptions,
  type ProductKey,
  type ProductOption,
  type SimulatorExampleMap,
} from "@/lib/orders/pricing";

type EditableCategory = "rice" | "design";

const SECTIONS: Array<{
  key: EditableCategory;
  title: string;
  description: string;
  icon: typeof Sparkles;
  keyPrefix: string;
}> = [
  {
    key: "rice",
    title: "앙금떡케이크",
    description: "떡케이크 메뉴를 추가, 수정, 삭제합니다.",
    icon: Sparkles,
    keyPrefix: "rice_custom",
  },
  {
    key: "design",
    title: "빵케이크",
    description: "빵케이크 메뉴를 추가, 수정, 삭제합니다.",
    icon: Cake,
    keyPrefix: "design_custom",
  },
];

function cloneExamples(examples: SimulatorExampleMap): SimulatorExampleMap {
  return Object.fromEntries(Object.entries(examples).map(([key, urls]) => [key, [...urls]])) as SimulatorExampleMap;
}

function makeProductKey(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeProducts(products: ProductOption[]) {
  return normalizeProductOptions(products).map((product, index) => ({ ...product, sortOrder: index }));
}

export default function AdminSimulatorPage() {
  const [products, setProducts] = useState<ProductOption[]>(sanitizeProducts(PRODUCT_OPTIONS));
  const [examples, setExamples] = useState<SimulatorExampleMap>(cloneExamples(DEFAULT_SIMULATOR_EXAMPLES));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const editableProducts = useMemo(
    () => products.filter((product) => product.category === "rice" || product.category === "design"),
    [products]
  );

  useEffect(() => {
    fetch("/api/admin/simulator/examples")
      .then((res) => res.json())
      .then((data) => {
        if (data?.products) setProducts(sanitizeProducts(data.products));
        if (data?.examples) setExamples(data.examples);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveCatalog = async (nextProducts = products, nextExamples = examples, message = "주문하기 설정을 저장했습니다.") => {
    setSaving(true);
    try {
      const cleanProducts = sanitizeProducts(nextProducts);
      const res = await fetch("/api/admin/simulator/examples", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: cleanProducts, examples: nextExamples }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "저장 실패");
      if (data?.products) setProducts(sanitizeProducts(data.products));
      if (data?.examples) setExamples(data.examples);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = (key: ProductKey, patch: Partial<ProductOption>) => {
    setProducts((prev) => sanitizeProducts(prev.map((product) => product.key === key ? { ...product, ...patch } : product)));
  };

  const addProduct = (category: EditableCategory) => {
    const section = SECTIONS.find((item) => item.key === category)!;
    const nextProduct: ProductOption = {
      key: makeProductKey(section.keyPrefix),
      title: category === "rice" ? "새 앙금떡케이크" : "새 빵케이크",
      category,
      basePrice: 0,
      priceLabel: "상담 후 확정",
      description: "",
      enabled: true,
      sortOrder: products.length,
    };
    setProducts((prev) => sanitizeProducts([...prev, nextProduct]));
    setExamples((prev) => ({ ...prev, [nextProduct.key]: [] }));
  };

  const removeProduct = (productKey: ProductKey) => {
    const product = products.find((item) => item.key === productKey);
    if (!product) return;
    if (!confirm(`${product.title} 메뉴를 삭제할까요? 기존 주문 이력은 유지되지만 새 주문 화면에서는 보이지 않습니다.`)) return;
    const nextProducts = products.filter((item) => item.key !== productKey);
    const nextExamples = { ...examples };
    delete nextExamples[productKey];
    setProducts(sanitizeProducts(nextProducts));
    setExamples(nextExamples);
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "cake-designs");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) {
      throw new Error(data?.detail ?? data?.error ?? "업로드에 실패했습니다.");
    }
    return String(data.url);
  };

  const uploadProductExample = async (productKey: ProductKey, file: File | undefined) => {
    if (!file) return;
    setUploadingKey(productKey);
    try {
      const url = await uploadImage(file);
      const nextExamples = {
        ...examples,
        [productKey]: [...(examples[productKey] ?? []), url],
      };
      setExamples(nextExamples);
      await saveCatalog(products, nextExamples, "상품 예시 이미지를 추가했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploadingKey(null);
    }
  };

  const removeExample = (productKey: ProductKey, index: number) => {
    setExamples((prev) => ({
      ...prev,
      [productKey]: (prev[productKey] ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Order Setup</p>
          <h1 className="text-2xl font-bold">주문하기 수정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            사장님이 주문 화면에 노출될 케이크 메뉴를 직접 추가, 삭제, 수정합니다.
          </p>
        </div>
        <button
          onClick={() => { void saveCatalog(); }}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          style={{ minHeight: "unset" }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? "저장됨" : "저장"}
        </button>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section, sectionIndex) => {
          const Icon = section.icon;
          const sectionProducts = editableProducts.filter((product) => product.category === section.key);
          return (
            <motion.section
              key={section.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.04 }}
              className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h2 className="font-semibold">{section.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addProduct(section.key)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  style={{ minHeight: "unset" }}
                >
                  <Plus size={13} />
                  메뉴 추가
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {sectionProducts.map((product) => {
                  const urls = examples[product.key] ?? [];
                  return (
                    <div key={product.key} className="space-y-4 rounded-2xl border border-border bg-background p-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                        <label className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">메뉴명</span>
                          <input
                            value={product.title}
                            onChange={(event) => updateProduct(product.key, { title: event.target.value })}
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">기본금액</span>
                          <input
                            type="number"
                            min={0}
                            value={product.basePrice}
                            onChange={(event) => updateProduct(product.key, {
                              basePrice: Number(event.target.value),
                              priceLabel: Number(event.target.value) > 0 ? `${formatWon(Number(event.target.value))}부터` : "상담 후 확정",
                            })}
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>
                      </div>

                      <label className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">가격 표시 문구</span>
                        <input
                          value={product.priceLabel}
                          onChange={(event) => updateProduct(product.key, { priceLabel: event.target.value })}
                          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">설명</span>
                        <textarea
                          value={product.description}
                          onChange={(event) => updateProduct(product.key, { description: event.target.value })}
                          rows={2}
                          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </label>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={product.enabled !== false}
                            onChange={(event) => updateProduct(product.key, { enabled: event.target.checked })}
                            className="h-4 w-4 accent-primary"
                          />
                          주문 화면 노출
                        </label>
                        <button
                          type="button"
                          onClick={() => removeProduct(product.key)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          style={{ minHeight: "unset" }}
                        >
                          <Trash2 size={13} />
                          메뉴 삭제
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {urls.map((url, index) => (
                          <div key={`${product.key}-${url}-${index}`} className="space-y-2">
                            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExample(product.key, index)}
                              className="flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
                              style={{ minHeight: "unset" }}
                            >
                              <X size={13} />
                              사진 삭제
                            </button>
                          </div>
                        ))}
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-xs font-medium text-muted-foreground hover:bg-muted">
                          {uploadingKey === product.key ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : urls.length === 0 ? (
                            <ImagePlus size={18} />
                          ) : (
                            <Upload size={18} />
                          )}
                          사진 추가
                          <input
                            type="file"
                            accept="image/*,.heic"
                            className="sr-only"
                            onChange={(event) => {
                              void uploadProductExample(product.key, event.target.files?.[0]);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
