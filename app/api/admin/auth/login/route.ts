import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createAdminSession, setAdminCookie } from "@/lib/auth/admin";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Supabase Auth로 이메일/비밀번호 검증
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 자체 JWT 세션 발급
    const token = await createAdminSession({
      userId: data.user.id,
      email: data.user.email!,
    });

    await setAdminCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/auth/login]", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
