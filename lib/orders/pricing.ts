export type ProductKey =
  | "rice_flower"
  | "rice_cupcake"
  | "knife_flower"
  | "figure_cake"
  | "design_cake"
  | "number_rice"
  | "dessert"
  | (string & {});

export type PaymentMethod = "card" | "bank_transfer";

export interface CakeOrderDetails {
  form_variant?: "design" | "rice";
  product_key?: ProductKey;
  size?: string;
  sheet_flavor?: string;
  rice_base?: string;
  rice_flower_style?: "dome" | "crescent" | "wreath_basic" | "wreath" | "blossom";
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
  reference_image_url?: string;
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

export type ProductCategory = "rice" | "design" | "dessert";

export type ProductOption = {
  key: ProductKey;
  title: string;
  priceLabel: string;
  basePrice: number;
  category: ProductCategory;
  description: string;
  enabled?: boolean;
  sortOrder?: number;
};

export const PRODUCT_OPTIONS: ProductOption[] = [
  {
    key: "rice_flower",
    title: "앙금플라워떡케이크",
    priceLabel: "1호 55,000원부터",
    basePrice: 55000,
    category: "rice",
    description: "1호~4호. 돔/크레센트/기본리스 추가금 없음, 가득메운 리스/블라썸 +7,000원, 문구 +3,000원.",
  },
  {
    key: "rice_cupcake",
    title: "앙금플라워 떡 컵케이크",
    priceLabel: "개당 16,000원",
    basePrice: 16000,
    category: "rice",
    description: "2개부터 주문 가능. 컵케이크 1개당 앙금꽃 1송이 장식, 대량 주문은 문의.",
  },
  {
    key: "knife_flower",
    title: "나이프플라워케이크",
    priceLabel: "43,000원부터",
    basePrice: 43000,
    category: "design",
    description: "빵케이크 카테고리. 디자인에 따라 추가금이 발생하며 문의가 필요합니다.",
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
  rice_cupcake: [
    "https://images.unsplash.com/photo-1729875749558-826bfeb4b1bb?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1762571807494-f67e8bf035d2?w=640&h=640&fit=crop",
  ],
  knife_flower: [
    "https://images.unsplash.com/photo-1771738118209-fc3b654f431e?w=640&h=640&fit=crop",
    "https://images.unsplash.com/photo-1595859806061-8163067b3119?w=640&h=640&fit=crop",
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

  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    if (Array.isArray(raw)) {
      const urls = raw
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean);
      if (urls.length > 0) next[key] = urls;
    }
  });

  return next;
}

export function normalizeProductOptions(value: unknown): ProductOption[] {
  const source = Array.isArray(value) ? value : PRODUCT_OPTIONS;
  const seen = new Set<string>();
  const products = source
    .map((item, index): ProductOption | null => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Partial<ProductOption>;
      const key = String(raw.key ?? "").trim();
      const title = String(raw.title ?? "").trim();
      const category = raw.category === "rice" || raw.category === "design" || raw.category === "dessert" ? raw.category : null;
      if (!key || !title || !category || seen.has(key)) return null;
      seen.add(key);
      const basePrice = Number(raw.basePrice ?? 0);
      return {
        key,
        title,
        category,
        basePrice: Number.isFinite(basePrice) && basePrice >= 0 ? Math.round(basePrice) : 0,
        priceLabel: String(raw.priceLabel ?? "").trim() || (basePrice > 0 ? formatWon(Math.round(basePrice)) : "상담 후 확정"),
        description: String(raw.description ?? "").trim(),
        enabled: raw.enabled !== false,
        sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
      } satisfies ProductOption;
    })
    .filter((item): item is ProductOption => item !== null)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return products.length > 0 ? products : PRODUCT_OPTIONS;
}

export function getVisibleProducts(products: ProductOption[] = PRODUCT_OPTIONS) {
  return normalizeProductOptions(products).filter((product) => product.enabled !== false && product.category !== "dessert");
}

export const SIZE_OPTIONS = ["1호", "2호", "3호", "4호"];
export const RICE_SIZE_DETAILS = ["1호 (15x7) 55,000원", "2호 (18x7) 65,000원", "3호 (21x7) 85,000원", "4호 (24x7) 105,000원"];
export const DESIGN_SIZE_DETAILS = ["1호 (15x6) 43,000원", "2호 (18x6) 55,000원", "3호 (21x6) 65,000원", "4호 (24x6) 75,000원"];
export const SHEET_FLAVORS = ["바닐라", "초코", "얼그레이"];
export const RICE_BASE_OPTIONS = ["백설기", "단호박", "흑임자"];
export const RICE_FILLING_OPTIONS: Record<string, string[]> = {
  백설기: ["딸기잼", "블루베리잼"],
  단호박: ["단호박잼", "견과류", "단호박잼+견과류"],
  흑임자: ["흑임자잼", "견과류", "흑임자잼+견과류"],
};

export function getRiceFillingOptions(riceBase: string | undefined) {
  return riceBase ? RICE_FILLING_OPTIONS[riceBase] ?? [] : [];
}

export function getProduct(key: ProductKey | undefined, products: ProductOption[] = PRODUCT_OPTIONS) {
  return normalizeProductOptions(products).find((product) => product.key === key) ?? normalizeProductOptions(products)[0] ?? PRODUCT_OPTIONS[0];
}

export function getDefaultProductForVariant(variant: "design" | "rice", products: ProductOption[] = PRODUCT_OPTIONS): ProductKey {
  return getVisibleProducts(products).find((product) => product.category === variant)?.key ?? (variant === "rice" ? "rice_flower" : "design_cake");
}

export function getProductVariant(productKey: ProductKey | undefined, products: ProductOption[] = PRODUCT_OPTIONS): "design" | "rice" {
  const product = getProduct(productKey, products);
  return product.category === "rice" ? "rice" : "design";
}

export function calculatePrice(details: CakeOrderDetails, products: ProductOption[] = PRODUCT_OPTIONS): PriceQuote {
  const product = getProduct(details.product_key, products);
  const addOns: PriceLine[] = [];
  const unknownItems: string[] = [];
  let basePrice = product.basePrice;

  if (product.key === "number_rice") {
    const count = Math.min(3, Math.max(1, details.number_count ?? 2));
    basePrice = 40000 * count;
  }

  if (product.key === "rice_cupcake") {
    const count = Math.max(2, details.number_count ?? 2);
    basePrice = 16000 * count;
    unknownItems.push("대량 주문은 매장 문의");
  }

  if (product.key === "rice_flower") {
    if (details.size?.startsWith("2호")) basePrice = 65000;
    if (details.size?.startsWith("3호")) basePrice = 85000;
    if (details.size?.startsWith("4호")) basePrice = 105000;

    if (details.rice_flower_style === "wreath") {
      addOns.push({ label: "가득메운 리스 추가", amount: 7000 });
    }
    if (details.rice_flower_style === "blossom") {
      addOns.push({ label: "블라썸 디자인 추가", amount: 7000 });
    }
    if (details.lettering) {
      addOns.push({ label: "문구 추가", amount: 3000 });
    }
  }

  if (product.category === "rice" && product.key !== "rice_flower" && product.key !== "number_rice" && details.phrase?.trim()) {
    addOns.push({ label: "문구 추가", amount: 3000 });
  }

  if (product.category === "design" && product.key !== "dessert") {
    if (details.size?.startsWith("2호")) basePrice = 55000;
    if (details.size?.startsWith("3호")) basePrice = 65000;
    if (details.size?.startsWith("4호")) basePrice = 75000;
    if (details.phrase?.trim()) addOns.push({ label: "레터링", amount: 3000 });
  }

  if (product.key === "figure_cake") {
    unknownItems.push("피규어 가격");
    if (details.two_tier) unknownItems.push("2단/높이 추가금");
  }
  if (product.key === "design_cake" || product.key === "knife_flower") {
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
