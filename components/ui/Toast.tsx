"use client";

import { cn } from "@/lib/utils/cn";
import { useEffect, useState } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

let toastQueue: ((item: ToastItem) => void)[] = [];

export function toast(
  message: string,
  variant: ToastVariant = "info"
) {
  const item: ToastItem = {
    id: Math.random().toString(36).slice(2),
    message,
    variant,
  };
  toastQueue.forEach((fn) => fn(item));
}

toast.success = (msg: string) => toast(msg, "success");
toast.error = (msg: string) => toast(msg, "error");

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-[var(--color-success)] text-white",
  error: "bg-destructive text-white",
  info: "bg-foreground text-white",
};

export function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 3500);
    };
    toastQueue.push(handler);
    return () => {
      toastQueue = toastQueue.filter((fn) => fn !== handler);
    };
  }, []);

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium shadow-lg",
            variantStyles[item.variant]
          )}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
