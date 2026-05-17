export function normalizeKoreanMobile(value: unknown) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!/^010\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function phoneDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}
