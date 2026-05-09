"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/cake/designs", label: "케이크", icon: "🎂" },
  { href: "/dessert", label: "디저트", icon: "🍪" },
  { href: "/orders/track", label: "주문조회", icon: "📦" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-line)] bg-[var(--color-bg)]/95 backdrop-blur-sm md:hidden">
      <ul className="flex">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors",
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted)]"
                )}
              >
                <span className="text-xl leading-tight">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
