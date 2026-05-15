import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { nanoid } from "nanoid";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
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
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

function getExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "jpg";
}

function getContentType(file: File) {
  if (file.type) return file.type;
  const ext = getExtension(file);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "image/jpeg";
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

  const ext = getExtension(file);
  const contentType = getContentType(file);

  if (!ALLOWED_TYPES.includes(contentType) && !ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "jpg, png, webp, heic 형식만 업로드 가능합니다." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "파일 크기는 10MB 이하여야 합니다." },
      { status: 400 }
    );
  }

  const filename = `${nanoid()}.${ext}`;

  const supabase = await createServiceClient();

  let uploadResult = await supabase.storage
    .from(bucket)
    .upload(filename, file, {
      contentType,
      upsert: false,
    });

  if (uploadResult.error && isMissingBucketError(uploadResult.error)) {
    await ensureBucket(supabase, bucket);
    uploadResult = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        contentType,
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
