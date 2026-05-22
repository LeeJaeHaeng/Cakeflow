import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { nanoid } from "nanoid";
import { validateImageUpload } from "@/lib/security/images";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_BUCKETS = new Set(["cake-designs", "simulator-previews"]);

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

async function ensureBucket(supabase: Awaited<ReturnType<typeof createServiceClient>>, bucket: string) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: MAX_SIZE,
    allowedMimeTypes: ALLOWED_TYPES,
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const requestedBucket = (formData.get("bucket") as string) ?? "cake-designs";
  const bucket = ALLOWED_BUCKETS.has(requestedBucket) ? requestedBucket : "cake-designs";

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  let image;
  try {
    image = await validateImageUpload(file, MAX_SIZE);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "IMAGE_TOO_LARGE") {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "jpg, png, webp, heic 형식만 업로드 가능합니다." },
      { status: 400 }
    );
  }

  const filename = `${nanoid()}.${image.extension}`;
  const uploadBuffer = new ArrayBuffer(image.bytes.byteLength);
  new Uint8Array(uploadBuffer).set(image.bytes);
  const uploadBody = new Blob([uploadBuffer], { type: image.contentType });

  const supabase = await createServiceClient();

  let uploadResult = await supabase.storage
    .from(bucket)
    .upload(filename, uploadBody, {
      contentType: image.contentType,
      upsert: false,
    });

  if (uploadResult.error && isMissingBucketError(uploadResult.error)) {
    await ensureBucket(supabase, bucket);
    uploadResult = await supabase.storage
      .from(bucket)
      .upload(filename, uploadBody, {
        contentType: image.contentType,
        upsert: false,
      });
  }

  if (uploadResult.error || !uploadResult.data) {
    console.error("[upload]", uploadResult.error);
    return NextResponse.json({
      error: "업로드에 실패했습니다.",
      detail: process.env.NODE_ENV === "development" ? uploadResult.error?.message : undefined,
    }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadResult.data.path);

  return NextResponse.json({ url: urlData.publicUrl });
}
