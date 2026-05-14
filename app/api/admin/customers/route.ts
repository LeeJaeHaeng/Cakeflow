import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const vipOnly = searchParams.get("vip") === "true";

  const supabase = await createServiceClient();

  let query = supabase
    .from("customers")
    .select("*")
    .order("total_orders", { ascending: false })
    .limit(200);

  if (vipOnly) query = query.eq("vip_flag", true);
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: data ?? [] });
}
