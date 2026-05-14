"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback, Suspense } from "react";
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
} from "lucide-react";
import type Konva from "konva";
import { useSimulatorStore } from "@/lib/simulator/store";
import { StickerPicker } from "@/components/simulator/StickerPicker";
import { TextEditor } from "@/components/simulator/TextEditor";

const SimulatorCanvas = dynamic(
  () => import("@/components/simulator/SimulatorCanvas").then((m) => ({ default: m.SimulatorCanvas })),
  { ssr: false }
);

const CANVAS_SIZE = 400;

const BG_COLORS = [
  "#FFFEFB", "#FFF5F5", "#FFF0F0", "#F5F0FF",
  "#F0FFF4", "#FFFFF0", "#F0F8FF", "#FFF8DC",
  "#FFE4E1", "#E8F4F8",
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
      <span>{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 text-[9px] bg-primary text-white rounded-full px-1">{badge}</span>
      )}
    </button>
  );
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get("designId");
  const stageRef = useRef<Konva.Stage | null>(null);

  const {
    objects, selectedId, bgColor, historyIdx, history,
    addObject, removeObject, setSelected, setBgColor,
    bringForward, sendBackward, undo, redo,
  } = useSimulatorStore();

  const [stickerOpen, setStickerOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);

  const addImageToCanvas = useCallback((src: string) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(CANVAS_SIZE * 0.6 / img.width, CANVAS_SIZE * 0.6 / img.height);
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
      });
    };
    img.src = src;
  }, [addObject]);

  // 이미지 업로드 + 선택적 배경 제거
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

    // HEIC 변환
    if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
      const heic2any = (await import("heic2any")).default;
      processedFile = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
    }

    // 이미지 압축
    const imageCompression = (await import("browser-image-compression")).default;
    processedFile = await imageCompression(processedFile as File, {
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    });

    const src = await readAsDataURL(processedFile);

    // 배경 제거 여부 사용자에게 묻기 (window.confirm — 간단하게)
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
  }, [addImageToCanvas]);

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
    });
  };

  const handleAddText = (text: string, fontFamily: string, fill: string, fontSize: number) => {
    addObject({
      type: "text",
      text,
      fontFamily,
      fill,
      fontSize,
      x: CANVAS_SIZE / 2 - 100,
      y: CANVAS_SIZE / 2 - fontSize / 2,
      width: 200,
      height: fontSize * 1.4,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      align: "center",
    });
  };

  // 캔버스 내보내기 → 주문으로 이동
  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    setSaving(true);
    try {
      // 선택 해제 후 내보내기
      setSelected(null);
      await new Promise((r) => setTimeout(r, 100));

      const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });

      // Blob → Supabase Storage 업로드
      const res = await fetch(dataURL);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append("file", blob, "simulator-preview.png");
      formData.append("bucket", "simulator-previews");

      const uploadRes = await fetch("/api/simulator/upload", { method: "POST", body: formData });
      const { url: previewUrl } = await uploadRes.json();

      // 세션 저장
      const { getSnapshot } = useSimulatorStore.getState();
      const snapshot = getSnapshot();
      const sessionRes = await fetch("/api/simulator/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design_id: designId,
          state_json: snapshot,
          preview_url: previewUrl,
        }),
      });
      const session = await sessionRes.json();

      setExportDone(true);
      setTimeout(() => {
        router.push(`/cake/order?simulatorSessionId=${session.id}${designId ? `&designId=${designId}` : ""}`);
      }, 800);
    } catch (err) {
      console.error("export failed", err);
      setSaving(false);
    }
  };

  const selectedObj = objects.find((o) => o.id === selectedId);

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#242424] border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm"
          style={{ minHeight: "unset" }}
        >
          <ChevronLeft size={18} />
          뒤로
        </button>
        <p className="text-white font-semibold text-sm">케이크 꾸미기</p>
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

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {removingBg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10 rounded-2xl">
            <Loader2 size={32} className="text-white animate-spin" />
            <p className="text-white text-sm">배경 제거 중...</p>
          </div>
        )}
        <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
          <SimulatorCanvas stageRef={stageRef} />
        </div>
      </div>

      {/* Selected object controls */}
      <AnimatePresence>
        {selectedId && selectedObj && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="mx-4 mb-2 flex items-center justify-center gap-2 bg-[#303030] rounded-2xl p-2"
          >
            <button
              onClick={() => bringForward(selectedId)}
              className="flex items-center gap-1 px-3 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10 text-xs transition-colors"
              style={{ minHeight: "unset" }}
            >
              <ArrowUp size={14} />
              앞으로
            </button>
            <button
              onClick={() => sendBackward(selectedId)}
              className="flex items-center gap-1 px-3 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10 text-xs transition-colors"
              style={{ minHeight: "unset" }}
            >
              <ArrowDown size={14} />
              뒤로
            </button>
            <div className="w-px h-4 bg-white/20" />
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

      {/* Background color picker */}
      <AnimatePresence>
        {bgOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#242424] border-t border-white/10"
          >
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
              <p className="text-white/50 text-xs flex-shrink-0">배경색</p>
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${
                    bgColor === c ? "border-[var(--color-cake-coral)] scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c, minHeight: "unset" }}
                />
              ))}
              {/* Custom color input */}
              <label className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer">
                <span className="text-white/50 text-xs">+</span>
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

      {/* Tool bar */}
      <div className="bg-[#242424] border-t border-white/10 px-2 py-3">
        <div className="flex items-center justify-around text-white">
          {/* Image upload */}
          <label className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-xs text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-all">
            <ImagePlus size={20} />
            <span>이미지</span>
            <input
              type="file"
              accept="image/*,.heic"
              className="sr-only"
              onChange={handleImageUpload}
            />
          </label>

          <ToolButton icon={Sticker} label="스티커" onClick={() => setStickerOpen(true)} />
          <ToolButton icon={Type} label="텍스트" onClick={() => setTextOpen(true)} />
          <ToolButton
            icon={Palette}
            label="배경색"
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
        open={textOpen}
        onClose={() => setTextOpen(false)}
        onAdd={handleAddText}
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
