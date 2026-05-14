import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("sns_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await request.json() as {
    caption?: string;
    image_urls?: string[];
    hashtags?: string[];
    scheduled_at?: string;
  };

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("sns_posts")
    .insert({
      caption: body.caption ?? null,
      image_urls: body.image_urls ?? [],
      hashtags: body.hashtags ?? [],
      scheduled_at: body.scheduled_at ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
