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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(31,26,23,0.10)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90 md:hidden">
      <ul className="grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold leading-none transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
