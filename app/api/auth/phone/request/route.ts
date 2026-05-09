import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const { phone: rawPhone } = await request.json();

    // 숫자만 추출 후 010XXXXXXXX 형식으로 정규화
    const digits = String(rawPhone ?? "").replace(/[^0-9]/g, "");
    if (!/^010\d{8}$/.test(digits)) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해주세요. (010으로 시작하는 11자리)" },
        { status: 400 }
      );
    }
    // 저장 형식: 010-XXXX-XXXX
    const phone = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;

    const result = await requestOtp(phone);

    return NextResponse.json({
      request_id: result.requestId,
      expires_in: result.expiresIn,
      ...(result.mockCode ? { _mock_code: result.mockCode } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";

    if (message === "OTP_COOLDOWN") {
      return NextResponse.json(
        { error: "잠시 후 다시 시도해주세요. (60초 후 재발송)" },
        { status: 429 }
      );
    }

    console.error("[auth/phone/request]", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
