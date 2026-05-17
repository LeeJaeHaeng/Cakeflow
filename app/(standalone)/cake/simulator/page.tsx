"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ImagePlus,
  Sticker,
  Type,
  Palette,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ArrowUp,
  ArrowDown,
  Layers,
  Loader2,
  CheckCircle2,
  Flower2,
  Cake,
  Pencil,
} from "lucide-react";
import type Konva from "konva";
import {
  useSimulatorStore,
  type RiceLayoutPreset,
  type SimObject,
  type SimulatorCakeType,
} from "@/lib/simulator/store";
import { StickerPicker } from "@/components/simulator/StickerPicker";
import { TextEditor, type LetteringEditorValue } from "@/components/simulator/TextEditor";
import {
  PRODUCT_OPTIONS,
  DEFAULT_SIMULATOR_EXAMPLES,
  formatWon,
  getProduct,
  getProductVariant,
  type ProductKey,
  type SimulatorExampleMap,
} from "@/lib/orders/pricing";

const SimulatorCanvas = dynamic(
  () => import("@/components/simulator/SimulatorCanvas").then((m) => ({ default: m.SimulatorCanvas })),
  { ssr: false }
);

const CANVAS_SIZE = 400;
const MAX_PREVIEW_UPLOAD_BYTES = 4.5 * 1024 * 1024;

const BG_COLORS = [
  "#FFFEFB", "#FFF5F5", "#FFF0F0", "#F5F0FF",
  "#F0FFF4", "#FFFFF0", "#F0F8FF", "#FFF8DC",
  "#FFE4E1", "#E8F4F8",
];

const CAKE_SIZE_OPTIONS = ["미니", "1호", "2호", "3호"];

const RICE_PRESETS: Array<{ id: RiceLayoutPreset; label: string; items: Array<[string, number, number, number]> }> = [
  {
    id: "crescent",
    label: "크레센트",
    items: [["🌸", 98, 120, -18], ["🌹", 124, 92, -8], ["🌷", 162, 78, 8], ["🌺", 198, 86, 16], ["🌿", 230, 112, 30]],
  },
  {
    id: "wreath",
    label: "리스",
    items: [["🌸", 112, 84, 0], ["🌷", 206, 70, 10], ["🌹", 286, 132, 28], ["🌺", 286, 250, -18], ["🌼", 194, 306, 4], ["🌿", 94, 224, -24]],
  },
  {
    id: "half",
    label: "반달",
    items: [["🌸", 82, 140, -14], ["🌷", 112, 104, 0], ["🌹", 158, 86, 14], ["🌺", 210, 96, 24], ["🌼", 246, 132, 34], ["🌿", 268, 178, 44]],
  },
  {
    id: "dome",
    label: "돔형",
    items: [["🌸", 128, 118, -6], ["🌷", 184, 96, 8], ["🌹", 238, 124, 18], ["🌺", 144, 178, -14], ["🌼", 206, 174, 6], ["💐", 176, 228, 0]],
  },
  {
    id: "free",
    label: "프리스타일",
    items: [["🌸", 122, 112, -10], ["🌿", 260, 114, 24], ["🌷", 116, 258, 8], ["🌼", 258, 250, -18]],
  },
];

function ToolButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  disabled = false,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-xs transition-all
        ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}
        ${disabled ? "opacity-30 pointer-events-none" : ""}
      `}
      style={{ minHeight: "unset" }}
    >
      <Icon size={20} />
      <span className="whitespace-nowrap">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 text-[9px] bg-primary text-primary-foreground rounded-full px-1">{badge}</span>
      )}
    </button>
  );
}

async function stageToPreviewBlob(stage: Konva.Stage) {
  for (const pixelRatio of [2, 1.5, 1]) {
    const dataURL = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
    const blob = await fetch(dataURL).then((res) => res.blob());
    if (blob.size <= MAX_PREVIEW_UPLOAD_BYTES || pixelRatio === 1) {
      return { dataURL, blob };
    }
  }

  throw new Error("시뮬레이터 미리보기 생성 실패");
}

function sanitizeSnapshotForSession<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitizeSnapshotForSession(item)) as T;
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    output[key] = typeof entry === "string" && entry.startsWith("data:image/")
      ? "[inline-image-omitted]"
      : sanitizeSnapshotForSession(entry);
  });
  return output as T;
}

function isProductKey(value: string | null): value is ProductKey {
  return PRODUCT_OPTIONS.some((product) => product.key === value);
}

const SIMULATOR_PRODUCTS = PRODUCT_OPTIONS.filter((product) => product.category !== "dessert");

function ProductChooser({
  examples,
  onChoose,
}: {
  examples: SimulatorExampleMap;
  onChoose: (productKey: ProductKey) => void;
}) {
  const groups = [
    {
      title: "앙금떡케이크",
      description: "설기, 앙금꽃, 나이프플라워, 레터링 중심의 주문시안",
      icon: Flower2,
      items: SIMULATOR_PRODUCTS.filter((product) => product.category === "rice"),
    },
    {
      title: "빵케이크",
      description: "그림, 피규어, 레터링 중심의 주문시안",
      icon: Cake,
      items: SIMULATOR_PRODUCTS.filter((product) => product.category === "design"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button onClick={() => history.back()} className="text-muted-foreground hover:text-foreground" style={{ minHeight: "unset" }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-sm font-semibold">케이크 시뮬레이터</p>
            <p className="text-[11px] text-muted-foreground">메뉴 선택 후 원형 케이크 시안을 만듭니다</p>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
        <div className="rounded-3xl bg-gradient-to-br from-primary/12 via-card to-[var(--color-cake-cream)] p-5 shadow-sm ring-1 ring-border">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">CakeFlow Simulator</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">주문할 케이크 메뉴를 먼저 선택하세요</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              선택한 메뉴에 맞춰 시뮬레이터 도구, 가격 기준, 주문서 세부 옵션이 이어집니다.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-6">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <section key={group.title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h2 className="font-semibold">{group.title}</h2>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.items.map((product) => {
                    const productExamples = examples?.[product.key] ?? DEFAULT_SIMULATOR_EXAMPLES[product.key] ?? [];
                    return (
                      <button
                        key={product.key}
                        onClick={() => onChoose(product.key)}
                        className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        style={{ minHeight: "unset" }}
                      >
                        <div className="grid grid-cols-[112px_1fr] sm:grid-cols-[148px_1fr]">
                          <div className="relative aspect-square bg-muted">
                            {productExamples[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={productExamples[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Cake size={22} />
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col justify-between p-4">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold">{product.title}</p>
                                <span className="shrink-0 text-xs font-bold text-primary">
                                  {product.basePrice > 0 ? formatWon(product.basePrice) : product.priceLabel}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5">
                              {productExamples.slice(0, 3).map((url, index) => (
                                <span key={`${product.key}-${index}`} className="h-8 w-8 overflow-hidden rounded-lg bg-muted">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                </span>
                              ))}
                              <span className="ml-auto text-xs font-medium text-primary">시작하기</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function ExampleStrip({
  productTitle,
  examples,
}: {
  productTitle: string;
  examples: string[];
}) {
  if (examples.length === 0) return null;

  return (
    <section className="w-full rounded-2xl border border-border bg-card p-3 shadow-sm lg:max-w-[220px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">예시 사진</p>
          <p className="text-[10px] text-muted-foreground">{productTitle}</p>
        </div>
        <span className="text-[10px] font-medium text-primary">관리자 수정 가능</span>
      </div>
      <div className="flex gap-2 overflow-x-auto lg:grid lg:grid-cols-1">
        {examples.slice(0, 3).map((url, index) => (
          <div key={`${url}-${index}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted lg:h-28 lg:w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}

function getLetteringPlacement(value: LetteringEditorValue, cakeType: SimulatorCakeType) {
  if (cakeType === "rice") {
    if (value.placement === "edge" || value.textMode === "arc") return { x: 0, y: -92, width: 320, height: 60 };
    if (value.placement === "bottom") return { x: 88, y: 264, width: 224, height: value.fontSize * 1.5 };
    if (value.placement === "center") return { x: 88, y: 190 - value.fontSize / 2, width: 224, height: value.fontSize * 1.5 };
  }

  return { x: CANVAS_SIZE / 2 - 110, y: CANVAS_SIZE / 2 - value.fontSize / 2, width: 220, height: value.fontSize * 1.5 };
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get("designId");
  const requestedCakeType = searchParams.get("cakeType");
  const requestedProductKey = searchParams.get("productKey");
  const initialProductKey = isProductKey(requestedProductKey) ? requestedProductKey : null;
  const initialType =
    initialProductKey
      ? getProductVariant(initialProductKey)
      : requestedCakeType === "rice" || requestedCakeType === "design"
        ? requestedCakeType
        : null;
  const stageRef = useRef<Konva.Stage | null>(null);

  const {
    objects, selectedId, bgColor, historyIdx, history, cakeType, cakeSize, layoutPreset, productKey,
    addObject, updateObject, removeObject, setSelected, setBgColor,
    setCakeType, setProductKey, setCakeSize, setLayoutPreset,
    bringForward, sendBackward, undo, redo,
  } = useSimulatorStore();

  const [modeReady, setModeReady] = useState(Boolean(initialType));
  const [stickerOpen, setStickerOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [examples, setExamples] = useState<SimulatorExampleMap>(DEFAULT_SIMULATOR_EXAMPLES);

  useEffect(() => {
    if (initialType) setCakeType(initialType);
    if (initialProductKey) setProductKey(initialProductKey);
  }, [initialProductKey, initialType, setCakeType, setProductKey]);

  useEffect(() => {
    fetch("/api/simulator/examples")
      .then((res) => res.json())
      .then((data) => {
        if (data?.examples) setExamples(data.examples);
      })
      .catch(() => {});
  }, []);

  const selectProduct = (nextProductKey: ProductKey) => {
    const type = getProductVariant(nextProductKey);
    setCakeType(type);
    setProductKey(nextProductKey);
    setModeReady(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("cakeType", type);
    params.set("productKey", nextProductKey);
    router.replace(`/cake/simulator?${params.toString()}`);
  };

  const selectedObj = objects.find((o) => o.id === selectedId);
  const isRice = cakeType === "rice";
  const selectedProduct = getProduct(productKey ?? initialProductKey ?? (isRice ? "rice_flower" : "design_cake"));
  const selectedExamples = examples?.[selectedProduct.key] ?? DEFAULT_SIMULATOR_EXAMPLES[selectedProduct.key] ?? [];

  const addImageToCanvas = useCallback((src: string) => {
    const img = new window.Image();
    img.onload = () => {
      const maxSide = isRice ? CANVAS_SIZE * 0.76 : CANVAS_SIZE * 0.6;
      const scale = Math.min(maxSide / img.width, maxSide / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      addObject({
        type: "image",
        src,
        x: (CANVAS_SIZE - w) / 2,
        y: (CANVAS_SIZE - h) / 2,
        width: w,
        height: h,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: isRice ? 0.72 : 1,
        role: isRice ? "reference" : "decor",
      });
    };
    img.src = src;
  }, [addObject, isRice]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const readAsDataURL = (f: File | Blob): Promise<string> =>
      new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(f);
      });

    let processedFile: File | Blob = file;

    if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
      const heic2any = (await import("heic2any")).default;
      processedFile = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
    }

    const imageCompression = (await import("browser-image-compression")).default;
    processedFile = await imageCompression(processedFile as File, {
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    });

    const src = await readAsDataURL(processedFile);

    if (isRice) {
      addImageToCanvas(src);
      return;
    }

    const wantsBgRemoval = window.confirm("배경을 자동으로 제거할까요?\n(AI 처리 약 5~15초 소요)");

    if (wantsBgRemoval) {
      setRemovingBg(true);
      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const resultBlob = await removeBackground(processedFile as File, {
          publicPath: "https://bundle.imgly.com/background-removal-web/",
          model: "isnet_quint8",
        });
        const finalSrc = await readAsDataURL(resultBlob);
        addImageToCanvas(finalSrc);
      } catch (err) {
        console.error("bg removal failed", err);
        addImageToCanvas(src);
      } finally {
        setRemovingBg(false);
      }
    } else {
      addImageToCanvas(src);
    }
  }, [addImageToCanvas, isRice]);

  const handleAddSticker = (emoji: string) => {
    addObject({
      type: "sticker",
      src: emoji,
      x: CANVAS_SIZE / 2 - 30,
      y: CANVAS_SIZE / 2 - 30,
      width: 60,
      height: 60,
      fontSize: 48,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      role: "decor",
    });
  };

  const applyRicePreset = (preset: RiceLayoutPreset) => {
    objects.filter((object) => object.role === "flower").forEach((object) => removeObject(object.id));
    const config = RICE_PRESETS.find((item) => item.id === preset);
    if (!config) return;
    config.items.forEach(([emoji, x, y, rotation]) => {
      addObject({
        type: "sticker",
        src: emoji,
        x,
        y,
        width: 54,
        height: 54,
        fontSize: 44,
        rotation,
        scaleX: 1,
        scaleY: 1,
        role: "flower",
      });
    });
    setLayoutPreset(preset);
  };

  const handleSaveText = (value: LetteringEditorValue) => {
    const placement = getLetteringPlacement(value, cakeType);
    const updates: Partial<SimObject> = {
      type: "text",
      text: value.text,
      fontFamily: value.fontFamily,
      fill: value.fill,
      fontSize: value.fontSize,
      rotation: value.rotation,
      scaleX: 1,
      scaleY: 1,
      align: value.align,
      textMode: value.textMode,
      placement: value.placement,
      role: "lettering",
      ...placement,
    };

    if (selectedObj?.type === "text") {
      updateObject(selectedObj.id, updates);
      return;
    }

    addObject(updates as Omit<SimObject, "id">);
  };

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    setSaving(true);
    try {
      setSelected(null);
      await new Promise((r) => setTimeout(r, 100));

      const { dataURL, blob } = await stageToPreviewBlob(stage);
      const formData = new FormData();
      formData.append("file", blob, "simulator-preview.png");
      formData.append("bucket", "simulator-previews");

      let previewUrl: string | null = null;
      try {
        const uploadRes = await fetch("/api/simulator/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          previewUrl = uploadData.url;
        } else {
          console.warn("simulator upload skipped", uploadData);
        }
      } catch (uploadErr) {
        console.warn("simulator upload failed; using local preview fallback", uploadErr);
      }

      const { getSnapshot } = useSimulatorStore.getState();
      const snapshot = sanitizeSnapshotForSession(getSnapshot());
      const sessionRes = await fetch("/api/simulator/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design_id: designId,
          state_json: snapshot,
          preview_url: previewUrl,
        }),
      });
      if (!sessionRes.ok) {
        throw new Error("시뮬레이터 세션 저장 실패");
      }
      const session = await sessionRes.json();

      if (session?.id) {
        sessionStorage.setItem(`simulator_preview_${session.id}`, dataURL);
      }

      setExportDone(true);
      setTimeout(() => {
        const query = new URLSearchParams();
        query.set("simulatorSessionId", session.id);
        query.set("cakeType", cakeType);
        if (productKey) query.set("productKey", productKey);
        if (designId) query.set("designId", designId);
        router.push(`/cake/order?${query.toString()}`);
      }, 800);
    } catch (err) {
      console.error("export failed", err);
      setSaving(false);
    }
  };

  if (!modeReady) {
    return <ProductChooser examples={examples} onChoose={selectProduct} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm"
          style={{ minHeight: "unset" }}
        >
          <ChevronLeft size={18} />
          뒤로
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{selectedProduct.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {isRice
              ? `${cakeSize} · ${layoutPreset ? RICE_PRESETS.find((p) => p.id === layoutPreset)?.label : "프리스타일"}`
              : "원형 케이크 시안"}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={saving || objects.length === 0}
          className="flex items-center gap-1.5 px-4 h-8 rounded-full bg-[var(--color-cake-coral)] text-white text-xs font-semibold disabled:opacity-40 transition-opacity"
          style={{ minHeight: "unset" }}
        >
          {saving ? (
            exportDone ? <CheckCircle2 size={14} /> : <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {saving ? (exportDone ? "완료!" : "저장중...") : "주문하기"}
        </button>
        </div>
      </div>

      {isRice && (
        <div className="border-b border-border bg-card px-3 py-2 space-y-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {CAKE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => setCakeSize(size)}
                className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                  cakeSize === size ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border bg-background"
                }`}
                style={{ minHeight: "unset" }}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {RICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyRicePreset(preset.id)}
                className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                  layoutPreset === preset.id ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border bg-background"
                }`}
                style={{ minHeight: "unset" }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 p-4 lg:flex-row lg:items-start lg:py-6">
        <ExampleStrip productTitle={selectedProduct.title} examples={selectedExamples} />
        <div className="relative flex flex-1 items-center justify-center">
        {removingBg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10 rounded-2xl">
            <Loader2 size={32} className="text-white animate-spin" />
            <p className="text-white text-sm">배경 제거 중...</p>
          </div>
        )}
        <div className="rounded-3xl overflow-hidden border border-border bg-card shadow-xl" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
          <SimulatorCanvas stageRef={stageRef} />
        </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedId && selectedObj && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="mx-4 mb-2 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm overflow-x-auto"
          >
            {selectedObj.type === "text" && (
              <button
                onClick={() => setTextOpen(true)}
                className="flex items-center gap-1 px-3 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors"
                style={{ minHeight: "unset" }}
              >
                <Pencil size={14} />
                문구수정
              </button>
            )}
            <button
              onClick={() => bringForward(selectedId)}
              className="flex items-center gap-1 px-3 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors"
              style={{ minHeight: "unset" }}
            >
              <ArrowUp size={14} />
              앞으로
            </button>
            <button
              onClick={() => sendBackward(selectedId)}
              className="flex items-center gap-1 px-3 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors"
              style={{ minHeight: "unset" }}
            >
              <ArrowDown size={14} />
              뒤로
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => removeObject(selectedId)}
              className="flex items-center gap-1 px-3 h-8 rounded-xl text-red-400 hover:bg-red-400/10 text-xs transition-colors"
              style={{ minHeight: "unset" }}
            >
              <Trash2 size={14} />
              삭제
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bgOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-card"
          >
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
              <p className="text-muted-foreground text-xs flex-shrink-0">{isRice ? "설기색" : "케이크색"}</p>
              {BG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${
                    bgColor === color ? "border-[var(--color-cake-coral)] scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color, minHeight: "unset" }}
                />
              ))}
              <label className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer">
                <span className="text-muted-foreground text-xs">+</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-border bg-card px-2 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto scrollbar-hide">
          <label className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all">
            <ImagePlus size={20} />
            <span className="whitespace-nowrap">{isRice ? "참고사진" : "이미지"}</span>
            <input
              type="file"
              accept="image/*,.heic"
              className="sr-only"
              onChange={handleImageUpload}
            />
          </label>

          {!isRice && <ToolButton icon={Sticker} label="스티커" onClick={() => setStickerOpen(true)} />}
          {isRice && <ToolButton icon={Flower2} label="꽃배치" onClick={() => applyRicePreset("crescent")} />}
          <ToolButton icon={Type} label="레터링" onClick={() => { setSelected(null); setTextOpen(true); }} />
          <ToolButton
            icon={Palette}
            label={isRice ? "설기색" : "케이크색"}
            onClick={() => setBgOpen((v) => !v)}
            active={bgOpen}
          />
          <ToolButton
            icon={Undo2}
            label="실행취소"
            onClick={undo}
            disabled={historyIdx <= 0}
          />
          <ToolButton
            icon={Redo2}
            label="다시실행"
            onClick={redo}
            disabled={historyIdx >= history.length - 1}
          />
          <ToolButton
            icon={Layers}
            label={`레이어 ${objects.length}`}
            onClick={() => {}}
            badge={objects.length > 0 ? String(objects.length) : undefined}
          />
        </div>
      </div>

      <StickerPicker
        open={stickerOpen}
        onClose={() => setStickerOpen(false)}
        onSelect={handleAddSticker}
      />
      <TextEditor
        key={`${selectedObj?.type === "text" ? selectedObj.id : "new"}-${textOpen ? "open" : "closed"}-${cakeType}`}
        open={textOpen}
        onClose={() => setTextOpen(false)}
        onSave={handleSaveText}
        initialObject={selectedObj?.type === "text" ? selectedObj : null}
        riceMode={isRice}
      />
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
