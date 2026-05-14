"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import type { CakeDesign, DesignCategory } from "@/types/database";

const CATEGORIES: { value: DesignCategory; label: string }[] = [
  { value: "birthday", label: "생일" },
  { value: "first_birthday", label: "돌" },
  { value: "anniversary", label: "기념일" },
  { value: "couple", label: "커플" },
  { value: "wedding", label: "웨딩" },
  { value: "parents_day", label: "어버이날" },
  { value: "custom", label: "자유" },
  { value: "rice_cake", label: "떡케이크" },
  { value: "flower", label: "앙금플라워" },
];

interface Props {
  design?: CakeDesign;
  onSaved: (design: CakeDesign) => void;
  onClose: () => void;
}

export function DesignForm({ design, onSaved, onClose }: Props) {
  const isEdit = !!design;

  const [title, setTitle] = useState(design?.title ?? "");
  const [priceFrom, setPriceFrom] = useState(String(design?.price_from ?? ""));
  const [description, setDescription] = useState(design?.description ?? "");
  const [categories, setCategories] = useState<DesignCategory[]>(design?.categories ?? []);
  const [styleTags, setStyleTags] = useState((design?.style_tags ?? []).join(", "));
  const [thumbnailUrl, setThumbnailUrl] = useState(design?.thumbnail_url ?? "");
  const [simulatorEnabled, setSimulatorEnabled] = useState(design?.simulator_enabled ?? true);
  const [displayStatus, setDisplayStatus] = useState<"visible" | "hidden">((design?.display_status as "visible" | "hidden") ?? "visible");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleCategory(cat: DesignCategory) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "cake-designs");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "업로드 실패");
        return;
      }
      const { url } = await res.json();
      setThumbnailUrl(url);
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "제목을 입력해주세요.";
    if (!priceFrom || Number(priceFrom) <= 0) errs.priceFrom = "올바른 가격을 입력해주세요.";
    if (!thumbnailUrl) errs.thumbnail = "대표 이미지를 업로드해주세요.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        price_from: Number(priceFrom),
        description: description.trim() || null,
        categories,
        style_tags: styleTags.split(",").map((s) => s.trim()).filter(Boolean),
        thumbnail_url: thumbnailUrl,
        simulator_enabled: simulatorEnabled,
        display_status: displayStatus,
      };

      const url = isEdit ? `/api/designs/${design.id}` : "/api/designs";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "저장에 실패했습니다.");
        return;
      }

      const saved = await res.json();
      toast.success(isEdit ? "디자인을 수정했습니다." : "디자인을 등록했습니다.");
      onSaved(saved as CakeDesign);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center bg-black/40">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-lg)] md:rounded-[var(--radius-lg)] bg-white p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--color-fg)]">
            {isEdit ? "디자인 수정" : "새 디자인 등록"}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--color-line)] text-[var(--color-muted)]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="디자인명 *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. 벚꽃 앙금플라워 케이크"
            error={errors.title}
          />

          <Input
            label="시작 가격 (원) *"
            type="number"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            placeholder="65000"
            min={1000}
            error={errors.priceFrom}
          />

          {/* 대표 이미지 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-fg)]">대표 이미지 *</label>
            {thumbnailUrl ? (
              <div className="relative aspect-square w-32 rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-line)]">
                <Image src={thumbnailUrl} alt="썸네일" fill sizes="128px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setThumbnailUrl("")}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-line)] hover:border-[var(--color-primary)] transition-colors">
                {uploading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                ) : (
                  <span className="text-2xl">📷</span>
                )}
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
              </label>
            )}
            {errors.thumbnail && <p className="text-xs text-[var(--color-error)]">{errors.thumbnail}</p>}
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-fg)]">카테고리 (중복 선택)</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    categories.includes(cat.value)
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="스타일 태그 (쉼표로 구분)"
            value={styleTags}
            onChange={(e) => setStyleTags(e.target.value)}
            placeholder="심플, 레터링, 캐릭터"
            hint="고객 필터에 사용됩니다."
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-fg)]">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none"
              placeholder="디자인 설명을 입력하세요."
            />
          </div>

          {/* 옵션 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={simulatorEnabled}
                onChange={(e) => setSimulatorEnabled(e.target.checked)}
                className="rounded"
              />
              시뮬레이터 사용 가능
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={displayStatus === "visible"}
                onChange={(e) => setDisplayStatus(e.target.checked ? "visible" : "hidden")}
                className="rounded"
              />
              진열 (공개)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {isEdit ? "저장" : "등록"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
