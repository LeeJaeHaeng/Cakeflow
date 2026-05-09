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

    // auth.users에서 직접 bcrypt 비교로 검증
    const { data: rows, error } = await supabase
      .rpc("verify_admin_password" as never, { p_email: email, p_password: password });

    if (error) {
      console.error("[admin/auth/login] rpc error:", error);
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user?.id) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = await createAdminSession({
      userId: user.id,
      email: user.email,
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
