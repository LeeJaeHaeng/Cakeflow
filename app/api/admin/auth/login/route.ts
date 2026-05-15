import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createAdminSession, setAdminCookie } from "@/lib/auth/admin";

async function loginWithEnvAdmin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) return false;
  if (email !== adminEmail || password !== adminPassword) return false;

  const token = await createAdminSession({
    userId: "env-admin",
    email: adminEmail,
  });
  await setAdminCookie(token);
  return true;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (await loginWithEnvAdmin(email, password)) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createServiceClient();

    // auth.users에서 직접 bcrypt 비교로 검증 (verify_admin_password SQL 함수)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase as any).rpc("verify_admin_password", {
      p_email: email,
      p_password: password,
    });

    if (error) {
      console.error("[admin/auth/login] rpc error:", error);
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = Array.isArray(rows) ? (rows as any[])[0] : null;
    if (!user?.id) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = await createAdminSession({
      userId: user.id as string,
      email: user.email as string,
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
