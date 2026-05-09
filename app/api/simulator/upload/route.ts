import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }

    const filename = `${nanoid()}.png`;
    const supabase = await createServiceClient();

    const { data, error } = await supabase.storage
      .from("simulator-previews")
      .upload(filename, file, { contentType: "image/png", upsert: false });

    if (error) {
      console.error("[simulator/upload]", error);
      return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("simulator-previews")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("[simulator/upload]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
