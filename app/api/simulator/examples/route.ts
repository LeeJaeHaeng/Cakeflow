import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_SIMULATOR_EXAMPLES, normalizeSimulatorExamples } from "@/lib/orders/pricing";

export async function GET() {
  try {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("shop_settings")
      .select("value")
      .eq("key", "simulator_examples")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ examples: DEFAULT_SIMULATOR_EXAMPLES });
    }

    return NextResponse.json({ examples: normalizeSimulatorExamples(data?.value) });
  } catch {
    return NextResponse.json({ examples: DEFAULT_SIMULATOR_EXAMPLES });
  }
}
