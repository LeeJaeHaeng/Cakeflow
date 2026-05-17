import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import { createCustomerSession } from "@/lib/auth/customer";

export async function POST(request: Request) {
  try {
    const { request_id, code } = await request.json();

    if (!request_id || !code || String(code).length !== 6) {
      return NextResponse.json(
        { error: "인증번호를 올바르게 입력해주세요." },
        { status: 400 }
      );
    }

    const { phone } = await verifyOtp(request_id, String(code));

    const sessionToken = await createCustomerSession(phone);

    return NextResponse.json({ token: sessionToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";

    const errorMap: Record<string, { msg: string; status: number }> = {
      OTP_NOT_FOUND: { msg: "인증 요청을 찾을 수 없습니다.", status: 404 },
      OTP_EXPIRED:   { msg: "인증번호가 만료되었습니다. 다시 요청해주세요.", status: 422 },
      OTP_INVALID:   { msg: "인증번호가 올바르지 않습니다.", status: 422 },
      OTP_ALREADY_USED: { msg: "이미 사용된 인증번호입니다.", status: 422 },
    };

    const mapped = errorMap[message];
    if (mapped) {
      return NextResponse.json({ error: mapped.msg }, { status: mapped.status });
    }

    console.error("[auth/phone/verify]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
