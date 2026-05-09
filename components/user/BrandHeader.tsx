import Link from "next/link";

export function BrandHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[var(--color-line)] bg-[var(--color-bg)]/95 backdrop-blur-sm px-4">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-[var(--color-fg)]"
      >
        <span className="text-[var(--color-primary)] text-xl">🎂</span>
        <span className="text-lg tracking-tight">앙금앤케이크</span>
      </Link>

      <nav className="ml-auto flex items-center gap-1">
        <Link
          href="/orders/track"
          className="flex h-10 items-center rounded-[var(--radius-sm)] px-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-line)] transition-colors"
        >
          주문조회
        </Link>
        <Link
          href="/store"
          className="flex h-10 items-center rounded-[var(--radius-sm)] px-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-line)] transition-colors"
        >
          매장정보
        </Link>
      </nav>
    </header>
  );
}
