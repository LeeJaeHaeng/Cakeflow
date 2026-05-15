"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cake, CheckCircle2, ImagePlus, Loader2, Save, Sparkles, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import {
  DEFAULT_SIMULATOR_EXAMPLES,
  PRODUCT_OPTIONS,
  formatWon,
  type ProductKey,
  type SimulatorExampleMap,
} from "@/lib/orders/pricing";

const EDITABLE_PRODUCTS = PRODUCT_OPTIONS.filter((product) => product.category !== "dessert");

function cloneExamples(examples: SimulatorExampleMap): SimulatorExampleMap {
  return { ...examples };
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

  const updateUrl = (productKey: ProductKey, index: number, value: string) => {
    setExamples((prev) => {
      const urls = [...(prev[productKey] ?? [])];
      urls[index] = value;
      return { ...prev, [productKey]: urls };
    });
  };

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

  const uploadExample = async (productKey: ProductKey, index: number, file: File | undefined) => {
    if (!file) return;
    const key = `${productKey}-${index}`;
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "cake-designs");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        const urls = [...(examples[productKey] ?? [])];
        urls[index] = data.url;
        const nextExamples = { ...examples, [productKey]: urls };
        setExamples(nextExamples);
        await saveExamples(nextExamples);
        toast.success("이미지를 업로드하고 저장했습니다.");
      } else {
        toast.error(data?.detail ?? data?.error ?? "업로드에 실패했습니다.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploadingKey(null);
    }
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
    <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Simulator</p>
          <h1 className="text-2xl font-bold">시뮬레이터 예시 사진</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            고객이 케이크 메뉴를 고를 때 함께 보는 예시 이미지를 관리합니다.
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

      <div className="grid gap-4 lg:grid-cols-2">
        {EDITABLE_PRODUCTS.map((product, cardIndex) => {
          const urls = examples[product.key] ?? [];
          const Icon = product.category === "rice" ? Sparkles : Cake;
          return (
            <motion.section
              key={product.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: cardIndex * 0.03 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold">{product.title}</h2>
                    <span className="shrink-0 text-xs font-bold text-primary">
                      {product.basePrice > 0 ? formatWon(product.basePrice) : product.priceLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((index) => {
                  const url = urls[index] ?? "";
                  return (
                    <div key={index} className="space-y-2">
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImagePlus size={18} />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80">
                          {uploadingKey === `${product.key}-${index}` ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Upload size={13} />
                          )}
                          업로드
                          <input
                            type="file"
                            accept="image/*,.heic"
                            className="sr-only"
                            onChange={(event) => {
                              void uploadExample(product.key, index, event.target.files?.[0]);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {url && (
                          <button
                            type="button"
                            onClick={() => updateUrl(product.key, index, "")}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                            style={{ minHeight: "unset" }}
                          >
                            <X size={13} />
                          </button>
                        )}
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
