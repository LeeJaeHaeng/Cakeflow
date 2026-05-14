"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { DesignForm } from "./DesignForm";
import type { CakeDesign } from "@/types/database";

type DisplayStatus = "visible" | "hidden";

interface DesignWithImages extends CakeDesign {
  design_images: { id: string; url: string; sort_order: number }[];
}

interface Props {
  initialDesigns: DesignWithImages[];
}

export function DesignList({ initialDesigns }: Props) {
  const [designs, setDesigns] = useState(initialDesigns);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DesignWithImages | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openNew() {
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(design: DesignWithImages) {
    setEditTarget(design);
    setShowForm(true);
  }

  function handleSaved(saved: CakeDesign) {
    const design = { ...saved, design_images: [] } as DesignWithImages;
    setDesigns((prev) => {
      const exists = prev.find((d) => d.id === design.id);
      if (exists) {
        return prev.map((d) => (d.id === design.id ? { ...d, ...saved } : d));
      }
      return [design, ...prev];
    });
    setShowForm(false);
    setEditTarget(null);
  }

  async function handleToggleStatus(design: DesignWithImages) {
    const next: DisplayStatus = design.display_status === "visible" ? "hidden" : "visible";

    const res = await fetch(`/api/designs/${design.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_status: next }),
    });

    if (!res.ok) {
      toast.error("상태 변경에 실패했습니다.");
      return;
    }

    setDesigns((prev) =>
      prev.map((d) => (d.id === design.id ? { ...d, display_status: next } : d))
    );
    toast.success(next === "visible" ? "진열 상태로 변경했습니다." : "숨김 처리했습니다.");
  }

  async function handleDelete(design: DesignWithImages) {
    if (!confirm(`"${design.title}" 디자인을 삭제하시겠습니까?`)) return;

    setDeletingId(design.id);
    const res = await fetch(`/api/designs/${design.id}`, { method: "DELETE" });

    if (!res.ok) {
      toast.error("삭제에 실패했습니다.");
      setDeletingId(null);
      return;
    }

    setDesigns((prev) => prev.filter((d) => d.id !== design.id));
    toast.success("삭제했습니다.");
    setDeletingId(null);
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openNew} size="md">+ 새 디자인 등록</Button>
      </div>

      {designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🎂</span>
          <p className="font-medium text-foreground">등록된 디자인이 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">첫 번째 디자인을 등록해보세요!</p>
          <Button onClick={openNew} className="mt-4">디자인 등록하기</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {designs.map((design) => (
            <div
              key={design.id}
              className="group relative rounded-[var(--radius-lg)] border border-border bg-white overflow-hidden"
            >
              <div className="relative aspect-square bg-muted">
                {design.thumbnail_url ? (
                  <Image
                    src={design.thumbnail_url}
                    alt={design.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">🎂</div>
                )}
                {design.display_status === "hidden" && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">숨김</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="font-medium text-sm text-foreground truncate">{design.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ₩{design.price_from.toLocaleString()}~
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(design)}
                    className="flex-1 text-xs py-1.5 rounded border border-border hover:bg-muted transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleToggleStatus(design)}
                    className="flex-1 text-xs py-1.5 rounded border border-border hover:bg-muted transition-colors"
                  >
                    {design.display_status === "visible" ? "숨기기" : "진열"}
                  </button>
                  <button
                    onClick={() => handleDelete(design)}
                    disabled={deletingId === design.id}
                    className="text-xs py-1.5 px-2 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <DesignForm
          design={editTarget ?? undefined}
          onSaved={handleSaved}
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
        />
      )}
    </>
  );
}
