export function normalizeKoreanMobile(value: unknown) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!/^010\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function phoneDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function formatKoreanPhone(value: unknown) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (/^010\d{8}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (/^02\d{7,8}$/.test(digits)) {
    return digits.length === 9
      ? `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
      : `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (/^0\d{9,10}$/.test(digits)) {
    return digits.length === 10
      ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return String(value ?? "");
}

export function phoneTelHref(value: unknown) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? `tel:${digits}` : "#";
}
