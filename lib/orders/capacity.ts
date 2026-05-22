export function getCapacityErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const err = error as { code?: string; message?: string; details?: string; hint?: string };
  const text = [err.code, err.message, err.details, err.hint].filter(Boolean).join(" ");

  if (text.includes("SHOP_CAPACITY_HOLIDAY")) {
    return "선택한 날짜는 매장 휴무일입니다.";
  }
  if (text.includes("SHOP_CAPACITY_FULL")) {
    return "선택한 날짜는 예약이 마감되었습니다.";
  }

  return null;
}
