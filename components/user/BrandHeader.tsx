import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function BrandHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
      <Link
        href="/"
        className="flex min-w-0 items-center"
        aria-label="앙금앤케이크 홈"
      >
        <BrandLogo className="h-11 max-w-[190px]" priority />
      </Link>

      <nav className="ml-auto flex shrink-0 items-center gap-1.5">
        <Link
          href="/orders/track"
          className="flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          주문조회
        </Link>
        <Link
          href="/store"
          className="flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          매장정보
        </Link>
      </nav>
    </header>
  );
}
