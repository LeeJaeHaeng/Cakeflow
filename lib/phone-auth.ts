export const PHONE_AUTH_DISABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_PHONE_AUTH_DISABLED === "true";

export function phoneAuthDisabledResponse() {
  return {
    error: "현재 휴대폰 인증은 로컬 개발 환경에서만 비활성화할 수 있습니다.",
  };
}
