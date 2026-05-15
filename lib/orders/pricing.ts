export type ProductKey =
  | "rice_flower"
  | "tall_1_design"
  | "knife_flower"
  | "figure_cake"
  | "design_cake"
  | "number_rice"
  | "dessert";

export type PaymentMethod = "card" | "bank_transfer";

export interface CakeOrderDetails {
  form_variant?: "design" | "rice";
  product_key?: ProductKey;
  size?: string;
  sheet_flavor?: string;
  rice_base?: string;
  rice_flower_style?: "basic" | "wreath" | "blossom";
  number_count?: number;
  design_style?: string;
  desired_color?: string;
  lettering?: boolean;
  phrase?: string;
  candle?: boolean;
  topper_request?: string;
  figure_request?: string;
  two_tier?: boolean;
  filling?: string[];
  number_rice_cake?: boolean;
  reference_note?: string;
  allergy?: string;
  extra_request?: string;
  payment_method?: PaymentMethod;
}

export interface PriceLine {
  label: string;
  amount: number;
  note?: string;
}

export interface PriceQuote {
  productTitle: string;
  basePrice: number;
  addOns: PriceLine[];
  total: number;
  exact: boolean;
  unknownItems: string[];
}

export const PRODUCT_OPTIONS: Array<{
  key: ProductKey;
  title: string;
  priceLabel: string;
  basePrice: number;
  category: "rice" | "design" | "dessert";
  description: string;
}> = [
  {
    key: "rice_flower",
    title: "앙금플라워떡케이크",
    priceLabel: "55,000원",
    basePrice: 55000,
    category: "rice",
    description: "1호~4호. 리스/블라썸 스타일 +7,000원, 문구 +3,000원.",
  },
  {
    key: "tall_1_design",
    title: "높은1호 케이크",
    priceLabel: "95,000원",
    basePrice: 95000,
    category: "design",
    description: "높은 1호 디자인 빵 케이크. 생크림 충전, 크림치즈크림, 앙금꽃 데코.",
  },
  {
    key: "knife_flower",
    title: "나이프플라워케이크",
    priceLabel: "55,000원",
    basePrice: 55000,
    category: "rice",
    description: "높은 1호만 가능. 나이프로 그림 그리듯 디자인.",
  },
  {
    key: "figure_cake",
    title: "피규어케이크",
    priceLabel: "43,000원",
    basePrice: 43000,
    category: "design",
    description: "1호 기준. 피규어 가격 별도, 사이즈/2단/높이 추가 상담.",
  },
  {
    key: "design_cake",
    title: "디자인케이크",
    priceLabel: "43,000원",
    basePrice: 43000,
    category: "design",
    description: "케이크 위에 그림 그리는 케이크. 빵맛 추가금 없음, 1호~4호, 2단 가능.",
  },
  {
    key: "number_rice",
    title: "앙금플라워 숫자떡 케이크",
    priceLabel: "숫자 1개 40,000원",
    basePrice: 40000,
    category: "rice",
    description: "숫자 개당 40,000원. 최대 3개. 높이 3.5cm, 필링 불가.",
  },
  {
    key: "dessert",
    title: "디저트류",
    priceLabel: "변동가격",
    basePrice: 0,
    category: "dessert",
    description: "쿠키, 마카롱, 다쿠아즈, 시즌 보틀케이크 등 매장 판매 상품.",
  },
];

export type SimulatorExampleMap = Record<ProductKey, string[]>;

export const DEFAULT_SIMULATOR_EXAMPLES: SimulatorExampleMap = {
  rice_flower: [
    "https://images.unsplash.com/photo-1729875749558-826bfeb4b1bb?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1762571807494-f67e8bf035d2?w=640&h=640&fit=crop",
  ],
  tall_1_design: [
    "https://images.unsplash.com/photo-1771738118209-fc3b654f431e?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1595859806061-8163067b3119?w=640&h=640&fit=crop",
  ],
  knife_flower: [
    "https://images.unsplash.com/photo-1595859806061-8163067b3119?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1672749103540-6eb52167fecf?w=640&h=640&fit=crop",
  ],
  figure_cake: [
    "https://images.unsplash.com/photo-1595859806061-8163067b3119?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1771738118209-fc3b654f431e?w=640&h=640&fit=crop",
  ],
  design_cake: [
    "https://images.unsplash.com/photo-1595859806061-8163067b3119?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1771738118209-fc3b654f431e?w=640&h=640&fit=crop",
  ],
  number_rice: [
    "https://images.unsplash.com/photo-1762571807494-f67e8bf035d2?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1729875749558-826bfeb4b1bb?w=640&h=640&fit=crop",
  ],
  dessert: [
    "https://images.unsplash.com/photo-1672518478295-0e684ead1483?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1638518724390-671c222c18bb?w=640&h=640&fit=crop",
  ],
};

export function normalizeSimulatorExamples(value: unknown): SimulatorExampleMap {
  const next: SimulatorExampleMap = { ...DEFAULT_SIMULATOR_EXAMPLES };
  if (!value || typeof value !== "object") return next;

  PRODUCT_OPTIONS.forEach((product) => {
    const raw = (value as Partial<Record<ProductKey, unknown>>)[product.key];
    if (Array.isArray(raw)) {
      const urls = raw
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean);
      next[product.key] = urls.length > 0 ? urls : DEFAULT_SIMULATOR_EXAMPLES[product.key];
    }
  });

  return next;
}

export const SIZE_OPTIONS = ["1호", "2호", "3호", "4호"];
export const RICE_SIZE_DETAILS = ["1호 (15x7)", "2호 (18x7)", "3호 (21x7)", "4호 (24x7)"];
export const DESIGN_SIZE_DETAILS = ["1호", "2호", "3호", "4호"];
export const SHEET_FLAVORS = ["바닐라", "초코", "얼그레이"];
export const RICE_BASE_OPTIONS = ["백설기", "단호박", "흑임자"];
export const FILLING_OPTIONS = ["견과류", "딸기잼", "블루베리잼", "단호박잼", "흑임자잼", "통단팥"];

export function getProduct(key: ProductKey | undefined) {
  return PRODUCT_OPTIONS.find((product) => product.key === key) ?? PRODUCT_OPTIONS[0];
}

export function getDefaultProductForVariant(variant: "design" | "rice"): ProductKey {
  return variant === "rice" ? "rice_flower" : "design_cake";
}

export function getProductVariant(productKey: ProductKey | undefined): "design" | "rice" {
  const product = getProduct(productKey);
  return product.category === "rice" ? "rice" : "design";
}

export function calculatePrice(details: CakeOrderDetails): PriceQuote {
  const product = getProduct(details.product_key);
  const addOns: PriceLine[] = [];
  const unknownItems: string[] = [];
  let basePrice = product.basePrice;

  if (product.key === "number_rice") {
    const count = Math.min(3, Math.max(1, details.number_count ?? 2));
    basePrice = 40000 * count;
  }

  if (product.key === "rice_flower") {
    if (details.rice_flower_style === "wreath") {
      addOns.push({ label: "리스 스타일 추가", amount: 7000 });
    }
    if (details.rice_flower_style === "blossom") {
      addOns.push({ label: "블라썸 스타일 추가", amount: 7000 });
    }
    if (details.lettering) {
      addOns.push({ label: "문구 추가", amount: 3000 });
    }
  }

  if (product.key === "tall_1_design" && details.topper_request) {
    unknownItems.push("샹드리에초/티아라 등 토퍼 비용");
  }
  if (product.key === "knife_flower") {
    unknownItems.push("데코/디자인 난이도별 추가금");
  }
  if (product.key === "figure_cake") {
    unknownItems.push("피규어 가격");
    if (details.size && details.size !== "1호") unknownItems.push("1호 외 사이즈 추가금");
    if (details.two_tier) unknownItems.push("2단/높이 추가금");
  }
  if (product.key === "design_cake") {
    if (details.design_style) unknownItems.push("그림/디자인 난이도별 추가금");
    if (details.two_tier) unknownItems.push("2단 제작 추가금");
  }
  if (product.key === "dessert") {
    unknownItems.push("디저트 품목별 변동 가격");
  }

  const total = basePrice + addOns.reduce((sum, item) => sum + item.amount, 0);

  return {
    productTitle: product.title,
    basePrice,
    addOns,
    total,
    exact: unknownItems.length === 0,
    unknownItems,
  };
}

export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}
