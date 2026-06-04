function isEnabled(value: string | undefined) {
  return value?.replace(/^\uFEFF/, "").trim().toLowerCase() === "true";
}

export const PHONE_AUTH_DISABLED =
  isEnabled(process.env.NEXT_PUBLIC_PHONE_AUTH_DISABLED) ||
  isEnabled(process.env.PHONE_AUTH_DISABLED);

export function phoneAuthDisabledResponse() {
  return {
    disabled: true,
    message: "현재 휴대폰 인증은 임시 비활성화 상태입니다.",
  };
}
