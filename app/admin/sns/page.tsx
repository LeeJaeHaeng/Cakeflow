"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Plus, Copy, Trash2, Hash, Loader2, CheckCircle2, X, Upload } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface SnsPost {
  id: string;
  caption: string | null;
  image_urls: string[];
  hashtags: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "임시저장", scheduled: "예약됨", published: "발행완료", failed: "실패",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
};

function NewPostModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [designTitle, setDesignTitle] = useState("");
  const [occasion, setOccasion] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "cake-designs");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setImageUrl(data.url);
        toast.success("이미지를 업로드했습니다.");
      } else {
        toast.error(data?.detail ?? data?.error ?? "업로드에 실패했습니다.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/sns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design_title: designTitle, occasion, image_url: imageUrl || undefined }),
      });
      const data = await res.json() as { caption: string; hashtags: string[] };
      setCaption(data.caption ?? "");
      setHashtags(data.hashtags ?? []);
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!caption) return;
    setSaving(true);
    await fetch("/api/admin/sns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        hashtags,
        image_urls: imageUrl ? [imageUrl] : [],
      }),
    });
    setSaving(false);
    onSave();
    onClose();
  };

  const copyToClipboard = () => {
    const text = `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg bg-card rounded-2xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">새 포스트 작성</h2>
          <button onClick={onClose} style={{ minHeight: "unset" }}>
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* 입력 */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">케이크 이름</label>
            <input
              value={designTitle}
              onChange={(e) => setDesignTitle(e.target.value)}
              placeholder="예: 앙금플라워 생일케이크"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">용도/행사</label>
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="예: 생일, 돌잔치, 기념일"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">이미지 업로드 (선택)</label>
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-background text-muted-foreground">
                  <Hash size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-card/80">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  로컬 이미지 업로드
                  <input
                    type="file"
                    accept="image/*,.heic"
                    className="sr-only"
                    onChange={(event) => {
                      void uploadImage(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="ml-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    style={{ minHeight: "unset" }}
                  >
                    제거
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          style={{ minHeight: "unset" }}
          onClick={generate}
          disabled={generating}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "AI 캡션 생성 중..." : "AI 캡션 자동 생성"}
        </button>

        {caption && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">캡션</label>
              <textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            {hashtags.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">해시태그</label>
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map((h) => (
                    <span key={h} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      #{h}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                style={{ minHeight: "unset" }}
                onClick={copyToClipboard}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted"
              >
                <Copy size={14} />
                복사
              </button>
              <button
                style={{ minHeight: "unset" }}
                onClick={save}
                disabled={saving}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                저장
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function SNSPage() {
  const [posts, setPosts] = useState<SnsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sns");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void fetchPosts(); });
  }, [fetchPosts]);

  const deletePost = async (id: string) => {
    await fetch(`/api/admin/sns/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const copyPost = (post: SnsPost) => {
    const text = `${post.caption ?? ""}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SNS 자동화</h1>
          <p className="text-muted-foreground text-sm mt-1">AI로 인스타그램 캡션을 자동 생성하세요</p>
        </div>
        <button
          style={{ minHeight: "unset" }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} />
          새 포스트
        </button>
      </div>

      {/* AI 소개 배너 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">AI 캡션 자동 생성</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            케이크 이름과 용도를 입력하면 인스타그램 최적화 캡션을 자동으로 만들어드려요.
            {!process.env.NEXT_PUBLIC_HAS_OPENAI && " (현재 샘플 모드)"}
          </p>
        </div>
      </div>

      {/* 포스트 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Hash size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">저장된 포스트가 없습니다.</p>
          <button
            style={{ minHeight: "unset" }}
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 text-sm text-primary font-medium border border-primary rounded-xl hover:bg-primary/5"
          >
            첫 포스트 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                {post.image_urls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.image_urls[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <Hash size={22} className="text-purple-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status]}`}>
                      {STATUS_LABELS[post.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                    {post.caption ?? "캡션 없음"}
                  </p>
                  {post.hashtags.length > 0 && (
                    <p className="text-xs text-primary/70 mt-1 truncate">
                      {post.hashtags.slice(0, 4).map((h) => `#${h}`).join(" ")}
                      {post.hashtags.length > 4 && ` +${post.hashtags.length - 4}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    style={{ minHeight: "unset" }}
                    onClick={() => copyPost(post)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="복사"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    style={{ minHeight: "unset" }}
                    onClick={() => deletePost(post.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <NewPostModal onClose={() => setShowModal(false)} onSave={fetchPosts} />
        )}
      </AnimatePresence>
    </div>
  );
}
