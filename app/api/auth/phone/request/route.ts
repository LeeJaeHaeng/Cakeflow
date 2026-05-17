import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { normalizeKoreanMobile } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    const { phone: rawPhone } = await request.json();

    const phone = normalizeKoreanMobile(rawPhone);
    if (!phone) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해주세요. (010으로 시작하는 11자리)" },
        { status: 400 }
      );
    }

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
    if (message === "OTP_SEND_FAILED") {
      return NextResponse.json(
        { error: "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요." },
        { status: 502 }
      );
    }

    console.error("[auth/phone/request]", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
