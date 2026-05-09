import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth/admin";
import { AdminShell } from "./_components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
