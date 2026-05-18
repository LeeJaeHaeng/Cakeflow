export const PHONE_AUTH_DISABLED = process.env.NEXT_PUBLIC_PHONE_AUTH_DISABLED !== "false";

export function phoneAuthDisabledResponse() {
  return {
    error: "현재 휴대폰 인증은 임시 비활성화 상태입니다.",
  };
}
