import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { DesignList } from "./DesignList";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "디자인 관리 | 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminDesignsPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = await createServiceClient();
  const { data: designs } = await supabase
    .from("cake_designs")
    .select("*, design_images(*)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">디자인 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            총 {designs?.length ?? 0}개 디자인
          </p>
        </div>
      </div>

      <DesignList initialDesigns={designs ?? []} />
    </div>
  );
}
