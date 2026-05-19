import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_SIMULATOR_EXAMPLES, PRODUCT_OPTIONS, normalizeProductOptions, normalizeSimulatorExamples } from "@/lib/orders/pricing";

export async function GET() {
  try {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("shop_settings")
      .select("key, value")
      .in("key", ["simulator_examples", "order_products"]);

    if (error) {
      return NextResponse.json({ examples: DEFAULT_SIMULATOR_EXAMPLES, products: PRODUCT_OPTIONS });
    }

    const rows = Object.fromEntries(((data ?? []) as Array<{ key: string; value: unknown }>).map((row) => [row.key, row.value]));
    return NextResponse.json({
      examples: normalizeSimulatorExamples(rows.simulator_examples),
      products: normalizeProductOptions(rows.order_products),
    });
  } catch {
    return NextResponse.json({ examples: DEFAULT_SIMULATOR_EXAMPLES, products: PRODUCT_OPTIONS });
  }
}
