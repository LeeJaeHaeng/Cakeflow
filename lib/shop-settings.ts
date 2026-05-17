export type DayHour = { open: string; close: string; closed: boolean };
export type OperatingHours = Record<string, DayHour>;

export type ShopSettings = {
  operating_hours: OperatingHours;
  daily_capacity: { max_orders: number };
  pickup_slots: { slots: string[] };
  sms_messages: Record<string, string>;
  shop_info: {
    name: string;
    phone: string;
    address: string;
    kakao_url: string;
    instagram_url: string;
  };
};

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

export const DEFAULT_SETTINGS: ShopSettings = {
  operating_hours: {
    mon: { open: "10:00", close: "19:00", closed: false },
    tue: { open: "10:00", close: "19:00", closed: false },
    wed: { open: "10:00", close: "19:00", closed: false },
    thu: { open: "10:00", close: "19:00", closed: false },
    fri: { open: "10:00", close: "19:00", closed: false },
    sat: { open: "10:00", close: "18:00", closed: false },
    sun: { open: "00:00", close: "00:00", closed: true },
  },
  daily_capacity: { max_orders: 8 },
  pickup_slots: { slots: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"] },
  sms_messages: {
    confirmed: "[앙금앤케이크] 주문이 확정되었습니다. 픽업일에 방문해 주세요.",
    producing: "[앙금앤케이크] 케이크 제작을 시작했습니다.",
    ready: "[앙금앤케이크] 케이크 준비가 완료되었습니다! 오늘 방문해 주세요.",
    cancelled: "[앙금앤케이크] 주문이 취소되었습니다. 문의: 031-000-0000",
  },
  shop_info: {
    name: "앙금앤케이크",
    phone: "031-000-0000",
    address: "경기 수원시 팔달구 정자천로14번길 40",
    kakao_url: "https://pf.kakao.com/_hXAiK",
    instagram_url: "https://instagram.com/anggeumandcake",
  },
};

export function mergeShopSettings(settings: Record<string, unknown>): ShopSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    shop_info: {
      ...DEFAULT_SETTINGS.shop_info,
      ...((settings.shop_info as Partial<ShopSettings["shop_info"]> | undefined) ?? {}),
    },
    operating_hours: {
      ...DEFAULT_SETTINGS.operating_hours,
      ...((settings.operating_hours as Partial<OperatingHours> | undefined) ?? {}),
    } as OperatingHours,
    daily_capacity: {
      ...DEFAULT_SETTINGS.daily_capacity,
      ...((settings.daily_capacity as Partial<ShopSettings["daily_capacity"]> | undefined) ?? {}),
    },
    pickup_slots: {
      ...DEFAULT_SETTINGS.pickup_slots,
      ...((settings.pickup_slots as Partial<ShopSettings["pickup_slots"]> | undefined) ?? {}),
    },
    sms_messages: {
      ...DEFAULT_SETTINGS.sms_messages,
      ...((settings.sms_messages as Partial<ShopSettings["sms_messages"]> | undefined) ?? {}),
    } as Record<string, string>,
  };
}
