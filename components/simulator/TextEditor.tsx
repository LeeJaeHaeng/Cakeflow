"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { LetteringMode, LetteringPlacement, SimObject } from "@/lib/simulator/store";

const FONT_OPTIONS = [
  { label: "기본", value: "Pretendard, sans-serif" },
  { label: "명조", value: "Georgia, serif" },
  { label: "고딕", value: "'Noto Sans KR', sans-serif" },
];

const FONT_COLORS = [
  "#1F1A17", "#C8534A", "#D4A574", "#E8B4B8",
  "#6B9F71", "#4A90D9", "#9B59B6", "#FFFFFF",
];

const PLACEMENTS: Array<{ label: string; value: LetteringPlacement }> = [
  { label: "중앙", value: "center" },
  { label: "하단", value: "bottom" },
  { label: "테두리", value: "edge" },
  { label: "자유", value: "free" },
];

const MODES: Array<{ label: string; value: LetteringMode }> = [
  { label: "직선", value: "straight" },
  { label: "곡선", value: "arc" },
];

export interface LetteringEditorValue {
  text: string;
  fontFamily: string;
  fill: string;
  fontSize: number;
  align: string;
  textMode: LetteringMode;
  placement: LetteringPlacement;
  rotation: number;
}

interface TextEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: LetteringEditorValue) => void;
  initialObject?: SimObject | null;
  riceMode?: boolean;
}

function createInitialValue(initialObject?: SimObject | null): LetteringEditorValue {
  return {
    text: initialObject?.text ?? "",
    fontFamily: initialObject?.fontFamily ?? FONT_OPTIONS[0].value,
    fill: initialObject?.fill ?? "#1F1A17",
    fontSize: initialObject?.fontSize ?? 32,
    align: initialObject?.align ?? "center",
    textMode: initialObject?.textMode ?? "straight",
    placement: initialObject?.placement ?? "center",
    rotation: initialObject?.rotation ?? 0,
  };
}

export function TextEditor({ open, onClose, onSave, initialObject, riceMode = false }: TextEditorProps) {
  const [value, setValue] = useState<LetteringEditorValue>(() => createInitialValue(initialObject));

  const update = (updates: Partial<LetteringEditorValue>) => {
    setValue((current) => ({ ...current, ...updates }));
  };

  const handleSave = () => {
    if (!value.text.trim()) return;
    onSave({ ...value, text: value.text.trim() });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 pb-safe max-h-[82vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-card flex items-center justify-between px-4 py-4 border-b border-border">
              <h3 className="font-semibold">{initialObject ? "레터링 수정" : "레터링 추가"}</h3>
              <button onClick={onClose} style={{ minHeight: "unset" }} aria-label="닫기">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div
                className="min-h-16 rounded-2xl bg-muted flex items-center justify-center px-4 py-3 whitespace-pre-wrap text-center"
                style={{ fontFamily: value.fontFamily, color: value.fill, fontSize: value.fontSize }}
              >
                {value.text || (
                  <span className="text-muted-foreground text-sm" style={{ fontFamily: "inherit", fontSize: 14 }}>
                    미리보기
                  </span>
                )}
              </div>

              <div>
                <textarea
                  value={value.text}
                  onChange={(e) => update({ text: e.target.value })}
                  placeholder="예: 엄마 생신 축하드려요"
                  rows={3}
                  maxLength={riceMode ? 40 : 80}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {value.text.replace(/\s/g, "").length}/{riceMode ? 40 : 80}
                </p>
              </div>

              {riceMode && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">원형 케이크 위치</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PLACEMENTS.map((placement) => (
                      <button
                        key={placement.value}
                        onClick={() => update({
                          placement: placement.value,
                          textMode: placement.value === "edge" ? "arc" : value.textMode,
                        })}
                        className={`h-9 rounded-xl text-xs border transition-all ${
                          value.placement === placement.value
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border"
                        }`}
                        style={{ minHeight: "unset" }}
                      >
                        {placement.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">형태</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => update({ textMode: mode.value })}
                      className={`h-9 rounded-xl text-xs border transition-all ${
                        value.textMode === mode.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border"
                      }`}
                      style={{ minHeight: "unset" }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">폰트</p>
                <div className="flex gap-2">
                  {FONT_OPTIONS.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => update({ fontFamily: font.value })}
                      className={`flex-1 h-9 rounded-xl text-sm border transition-all ${
                        value.fontFamily === font.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border"
                      }`}
                      style={{ fontFamily: font.value, minHeight: "unset" }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">색상</p>
                <div className="flex gap-2">
                  {FONT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => update({ fill: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        value.fill === color ? "border-primary scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color, minHeight: "unset" }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">크기 ({value.fontSize}px)</p>
                  <input
                    type="range"
                    min={16}
                    max={80}
                    value={value.fontSize}
                    onChange={(e) => update({ fontSize: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">회전 ({value.rotation}도)</p>
                  <input
                    type="range"
                    min={-35}
                    max={35}
                    value={value.rotation}
                    onChange={(e) => update({ rotation: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!value.text.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-opacity"
                style={{ minHeight: "unset" }}
              >
                {initialObject ? "수정 완료" : "추가하기"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
