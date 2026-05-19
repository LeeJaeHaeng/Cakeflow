"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cake, CheckCircle2, Loader2, Plus, Save, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import {
  DEFAULT_SIMULATOR_EXAMPLES,
  PRODUCT_OPTIONS,
  formatWon,
  type ProductKey,
  type SimulatorExampleMap,
} from "@/lib/orders/pricing";

const EDITABLE_PRODUCTS = PRODUCT_OPTIONS.filter((product) => product.category !== "dessert");
const SIMULATOR_SECTIONS = [
  {
    key: "rice",
    title: "앙금떡케이크",
    description: "앙금플라워, 숫자떡, 컵케이크 예시를 관리합니다.",
    icon: Sparkles,
    products: EDITABLE_PRODUCTS.filter((product) => product.category === "rice"),
  },
  {
    key: "design",
    title: "빵케이크",
    description: "나이프플라워, 피규어, 디자인케이크 예시를 관리합니다.",
    icon: Cake,
    products: EDITABLE_PRODUCTS.filter((product) => product.category === "design"),
  },
] as const;

function cloneExamples(examples: SimulatorExampleMap): SimulatorExampleMap {
  return Object.fromEntries(
    PRODUCT_OPTIONS.map((product) => [product.key, [...(examples[product.key] ?? [])]])
  ) as SimulatorExampleMap;
}

export default function AdminSimulatorPage() {
  const [examples, setExamples] = useState<SimulatorExampleMap>(cloneExamples(DEFAULT_SIMULATOR_EXAMPLES));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/simulator/examples")
      .then((res) => res.json())
      .then((data) => {
        if (data?.examples) setExamples(data.examples);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveExamples = async (nextExamples: SimulatorExampleMap) => {
    const res = await fetch("/api/admin/simulator/examples", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examples: nextExamples }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "저장 실패");
    return data?.examples as SimulatorExampleMap | undefined;
  };

  const persistExamples = async (nextExamples: SimulatorExampleMap, message: string) => {
    setExamples(nextExamples);
    const savedExamples = await saveExamples(nextExamples);
    if (savedExamples) setExamples(savedExamples);
    toast.success(message);
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
    const key = `product-${productKey}`;
    setUploadingKey(key);
    try {
      const url = await uploadImage(file);
      const nextExamples = {
        ...examples,
        [productKey]: [...(examples[productKey] ?? []), url],
      };
      await persistExamples(nextExamples, "상품 예시 이미지를 추가했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadSectionExample = async (section: (typeof SIMULATOR_SECTIONS)[number], file: File | undefined) => {
    if (!file) return;
    const key = `section-${section.key}`;
    setUploadingKey(key);
    try {
      const url = await uploadImage(file);
      const nextExamples = { ...examples };
      section.products.forEach((product) => {
        nextExamples[product.key] = [...(nextExamples[product.key] ?? []), url];
      });
      await persistExamples(nextExamples, `${section.title} 섹션에 예시 이미지를 추가했습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploadingKey(null);
    }
  };

  const removeProductExample = async (productKey: ProductKey, index: number) => {
    const nextExamples = {
      ...examples,
      [productKey]: (examples[productKey] ?? []).filter((_, itemIndex) => itemIndex !== index),
    };
    await persistExamples(nextExamples, "상품 예시 이미지를 삭제했습니다.");
  };

  const clearSectionExamples = async (section: (typeof SIMULATOR_SECTIONS)[number]) => {
    const nextExamples = { ...examples };
    section.products.forEach((product) => {
      nextExamples[product.key] = [];
    });
    await persistExamples(nextExamples, `${section.title} 섹션 예시 이미지를 모두 삭제했습니다.`);
  };

  const save = async () => {
    setSaving(true);
    try {
      const savedExamples = await saveExamples(examples);
      if (savedExamples) setExamples(savedExamples);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("예시 사진을 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
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
            사용자 주문 화면처럼 앙금떡케이크와 빵케이크 섹션별 예시 이미지를 관리합니다.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          style={{ minHeight: "unset" }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? "저장됨" : "저장"}
        </button>
      </div>

      <div className="space-y-6">
        {SIMULATOR_SECTIONS.map((section, sectionIndex) => {
          const Icon = section.icon;
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
                <div className="flex gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
                    {uploadingKey === `section-${section.key}` ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    섹션에 추가
                    <input
                      type="file"
                      accept="image/*,.heic"
                      className="sr-only"
                      onChange={(event) => {
                        void uploadSectionExample(section, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => { void clearSectionExamples(section); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    style={{ minHeight: "unset" }}
                  >
                    <Trash2 size={13} />
                    섹션 전체 삭제
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {section.products.map((product) => {
                  const urls = examples[product.key] ?? [];
                  return (
                    <div key={product.key} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold">{product.title}</h3>
                            <span className="shrink-0 text-xs font-bold text-primary">
                              {product.basePrice > 0 ? formatWon(product.basePrice) : product.priceLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {urls.map((url, index) => (
                          <div key={`${product.key}-${url}-${index}`} className="space-y-2">
                            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <button
                              type="button"
                              onClick={() => { void removeProductExample(product.key, index); }}
                              className="flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
                              style={{ minHeight: "unset" }}
                            >
                              <X size={13} />
                              삭제
                            </button>
                          </div>
                        ))}
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-xs font-medium text-muted-foreground hover:bg-muted">
                          {uploadingKey === `product-${product.key}` ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Upload size={18} />
                          )}
                          이미지 추가
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
