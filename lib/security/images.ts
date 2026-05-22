const SUPABASE_STORAGE_PATH_PREFIX = "/storage/v1/object/public/";
const ALLOWED_IMAGE_BUCKETS = new Set(["cake-designs", "simulator-previews"]);
const REMOTE_IMAGE_TIMEOUT_MS = 8000;
const REMOTE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export type ValidatedImageUpload = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
};

function getSupabaseHost() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function detectImageType(bytes: Uint8Array): Omit<ValidatedImageUpload, "bytes"> | null {
  if (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  const brand = String.fromCharCode(...bytes.slice(4, 12));
  if (brand.startsWith("ftypheic") || brand.startsWith("ftypheix") || brand.startsWith("ftyphevc")) {
    return { contentType: "image/heic", extension: "heic" };
  }
  if (brand.startsWith("ftypheif") || brand.startsWith("ftypmif1") || brand.startsWith("ftypmsf1")) {
    return { contentType: "image/heif", extension: "heif" };
  }

  return null;
}

export async function validateImageUpload(file: File, maxSize: number): Promise<ValidatedImageUpload> {
  if (file.size > maxSize) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageType(bytes);

  if (!detected) {
    throw new Error("IMAGE_TYPE_UNSUPPORTED");
  }

  return { bytes, ...detected };
}

export function isAllowedPublicStorageImageUrl(imageUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return false;
  }

  const supabaseHost = getSupabaseHost();
  if (!supabaseHost) return false;
  if (parsed.protocol !== "https:" || parsed.hostname !== supabaseHost) return false;
  if (!parsed.pathname.startsWith(SUPABASE_STORAGE_PATH_PREFIX)) return false;

  const pathAfterPrefix = parsed.pathname.slice(SUPABASE_STORAGE_PATH_PREFIX.length);
  const bucket = pathAfterPrefix.split("/")[0];
  return ALLOWED_IMAGE_BUCKETS.has(bucket);
}

export async function fetchAllowedPublicStorageImage(imageUrl: string) {
  if (!isAllowedPublicStorageImageUrl(imageUrl)) {
    throw new Error("IMAGE_URL_NOT_ALLOWED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_IMAGE_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) throw new Error("IMAGE_FETCH_FAILED");

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) throw new Error("IMAGE_CONTENT_TYPE_INVALID");

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > REMOTE_IMAGE_MAX_BYTES) throw new Error("IMAGE_TOO_LARGE");

    const reader = response.body?.getReader();
    if (!reader) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > REMOTE_IMAGE_MAX_BYTES) throw new Error("IMAGE_TOO_LARGE");
      return { bytes, contentType };
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > REMOTE_IMAGE_MAX_BYTES) {
        await reader.cancel();
        throw new Error("IMAGE_TOO_LARGE");
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { bytes, contentType };
  } finally {
    clearTimeout(timeout);
  }
}
