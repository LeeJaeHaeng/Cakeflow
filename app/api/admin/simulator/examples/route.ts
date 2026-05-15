import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeSimulatorExamples } from "@/lib/orders/pricing";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("shop_settings")
    .select("value")
    .eq("key", "simulator_examples")
    .maybeSingle();

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  return NextResponse.json({ examples: normalizeSimulatorExamples(data?.value) });
}

export async function PUT(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await request.json() as { examples?: unknown };
  const examples = normalizeSimulatorExamples(body.examples);
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("shop_settings")
    .upsert({
      key: "simulator_examples",
      value: examples,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  return NextResponse.json({ ok: true, examples });
}
