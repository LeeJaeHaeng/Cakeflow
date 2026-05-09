"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const FONT_OPTIONS = [
  { label: "기본", value: "Pretendard, sans-serif" },
  { label: "명조", value: "Georgia, serif" },
  { label: "고딕", value: "'Noto Sans KR', sans-serif" },
];

const FONT_COLORS = [
  "#1F1A17", "#C8534A", "#D4A574", "#E8B4B8",
  "#6B9F71", "#4A90D9", "#9B59B6", "#FFFFFF",
];

interface TextEditorProps {
  open: boolean;
  onClose: () => void;
  onAdd: (text: string, fontFamily: string, fill: string, fontSize: number) => void;
}

export function TextEditor({ open, onClose, onAdd }: TextEditorProps) {
  const [text, setText] = useState("");
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [fill, setFill] = useState("#1F1A17");
  const [fontSize, setFontSize] = useState(32);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), fontFamily, fill, fontSize);
    setText("");
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 pb-safe"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <h3 className="font-semibold">텍스트 추가</h3>
              <button onClick={onClose} style={{ minHeight: "unset" }}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              <div
                className="min-h-14 rounded-2xl bg-muted flex items-center justify-center px-4 py-3"
                style={{ fontFamily, color: fill, fontSize }}
              >
                {text || <span className="text-muted-foreground text-sm" style={{ fontFamily: "inherit", fontSize: 14 }}>미리보기</span>}
              </div>

              {/* Input */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="텍스트를 입력하세요..."
                rows={2}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />

              {/* Font */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">폰트</p>
                <div className="flex gap-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFontFamily(f.value)}
                      className={`flex-1 h-9 rounded-xl text-sm border transition-all ${
                        fontFamily === f.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border"
                      }`}
                      style={{ fontFamily: f.value, minHeight: "unset" }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">색상</p>
                <div className="flex gap-2">
                  {FONT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFill(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        fill === c ? "border-primary scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c, minHeight: "unset" }}
                    />
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">크기 ({fontSize}px)</p>
                <input
                  type="range"
                  min={16}
                  max={80}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={!text.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-opacity"
                style={{ minHeight: "unset" }}
              >
                추가하기
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
