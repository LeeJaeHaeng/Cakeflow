import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import { validateImageUpload } from "@/lib/security/images";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = "simulator-previews";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
function isMissingBucketError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const storageError = error as { message?: string; status?: number; statusCode?: string | number };
  return (
    storageError.status === 400 ||
    storageError.statusCode === 404 ||
    storageError.statusCode === "404" ||
    storageError.message?.toLowerCase().includes("bucket not found")
  );
}

async function ensureSimulatorBucket(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_SIZE,
    allowedMimeTypes: ALLOWED_TYPES,
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const uploadLimit = checkRateLimit(`simulator-upload:${getClientIp(request)}`, 20, 10 * 60 * 1000);
    if (!uploadLimit.allowed) return rateLimitResponse(uploadLimit.resetAt);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    let image;
    try {
      image = await validateImageUpload(file, MAX_SIZE);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "IMAGE_TOO_LARGE") {
        return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
      }
      return NextResponse.json({ error: "jpg, png, webp, heic 형식만 업로드 가능합니다." }, { status: 400 });
    }

    const filename = `${nanoid()}.${image.extension}`;
    const uploadBuffer = new ArrayBuffer(image.bytes.byteLength);
    new Uint8Array(uploadBuffer).set(image.bytes);
    const uploadBody = new Blob([uploadBuffer], { type: image.contentType });
    const supabase = await createServiceClient();

    let uploadResult = await supabase.storage
      .from(BUCKET)
      .upload(filename, uploadBody, { contentType: image.contentType, upsert: false });

    if (uploadResult.error && isMissingBucketError(uploadResult.error)) {
      await ensureSimulatorBucket(supabase);
      uploadResult = await supabase.storage
        .from(BUCKET)
        .upload(filename, uploadBody, { contentType: image.contentType, upsert: false });
    }

    if (uploadResult.error || !uploadResult.data) {
      console.error("[simulator/upload]", uploadResult.error);
      return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(uploadResult.data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("[simulator/upload]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
