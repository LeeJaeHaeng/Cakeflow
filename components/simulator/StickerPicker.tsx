"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const STICKER_GROUPS = [
  {
    label: "케이크",
    items: ["🎂", "🍰", "🧁", "🎁", "🎀", "🎊", "🎉", "✨", "⭐", "💫"],
  },
  {
    label: "꽃·자연",
    items: ["🌸", "🌷", "🌹", "🌻", "🌼", "💐", "🌿", "🍃", "🌺", "🌝"],
  },
  {
    label: "하트",
    items: ["❤️", "🩷", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕"],
  },
  {
    label: "음식",
    items: ["🍓", "🫐", "🍒", "🍑", "🍋", "🍊", "🍇", "🍎", "🍫", "🍬"],
  },
  {
    label: "기호",
    items: ["⭐", "🌟", "💎", "🎵", "🎶", "🔮", "🌈", "☁️", "🦋", "🐣"],
  },
];

interface StickerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function StickerPicker({ open, onClose, onSelect }: StickerPickerProps) {
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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 max-h-[60vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-card flex items-center justify-between px-4 py-4 border-b border-border">
              <h3 className="font-semibold">스티커 추가</h3>
              <button onClick={onClose} style={{ minHeight: "unset" }}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {STICKER_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
                  <div className="grid grid-cols-10 gap-1">
                    {group.items.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => { onSelect(emoji); onClose(); }}
                        className="text-2xl h-10 rounded-xl hover:bg-muted transition-colors flex items-center justify-center"
                        style={{ minHeight: "unset" }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
