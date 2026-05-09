import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";

const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: { code: "INVALID_PHONE", message: "올바른 휴대폰 번호를 입력해주세요." } },
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
        { error: { code: "OTP_COOLDOWN", message: "잠시 후 다시 시도해주세요. (60초 후 재발송)" } },
        { status: 429 }
      );
    }

    console.error("[auth/phone/request]", err);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "서버 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
