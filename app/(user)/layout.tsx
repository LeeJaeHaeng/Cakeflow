import { BrandHeader } from "@/components/user/BrandHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { SocialFooter } from "@/components/user/SocialFooter";
import { ToastProvider } from "@/components/ui/Toast";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BrandHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <SocialFooter />
      <BottomNav />
      <ToastProvider />
    </>
  );
}
