"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Users,
  Cake,
  Package,
  Share2,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const BASE_NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "대시보드", exact: true },
  { href: "/admin/orders", icon: ShoppingBag, label: "주문관리", exact: false },
  { href: "/admin/calendar", icon: Calendar, label: "일정 캘린더", exact: false },
  { href: "/admin/customers", icon: Users, label: "고객관리", exact: false },
  { href: "/admin/designs", icon: Cake, label: "디자인 관리", exact: false },
  { href: "/admin/products", icon: Package, label: "디저트 상품", exact: false },
  { href: "/admin/sns", icon: Share2, label: "SNS 자동화", exact: false },
  { href: "/admin/analytics", icon: BarChart3, label: "통계 분석", exact: false },
  { href: "/admin/settings", icon: Settings, label: "설정", exact: false },
];

function CakeFlowLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 flex-shrink-0">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="25" width="28" height="6" rx="3" fill="#C8534A" />
          <rect x="7" y="17" width="22" height="8" rx="2" fill="#D4A574" />
          <rect x="10" y="10" width="16" height="7" rx="2" fill="#E8B4B8" />
          <ellipse cx="14" cy="10" rx="2.5" ry="2" fill="white" opacity="0.9" />
          <ellipse cx="18" cy="9" rx="2.5" ry="2.2" fill="white" opacity="0.9" />
          <ellipse cx="22" cy="10" rx="2.5" ry="2" fill="white" opacity="0.9" />
          <rect x="17" y="5" width="2" height="5" rx="1" fill="#D4A574" />
          <ellipse cx="18" cy="5" rx="1.5" ry="1.5" fill="#E8A86B" />
          <ellipse cx="18" cy="4.5" rx="0.8" ry="1.2" fill="#FFDD99" />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-white tracking-tight">앙금앤케이크</span>
          <span className="text-xs text-white/50 tracking-widest mt-0.5">CakeFlow</span>
        </div>
      )}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/admin/login") return;
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setPendingCount(d.newOrderCount ?? 0))
      .catch(() => {});
  }, [pathname]);

  const navItems = BASE_NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.href === "/admin/orders" && pendingCount ? pendingCount : null,
  }));

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar
          shadow-xl lg:shadow-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          transition-transform lg:transition-none
        `}
        style={{ minWidth: collapsed ? 64 : 240 }}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
          <CakeFlowLogo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded text-white/40 hover:text-white hover:bg-sidebar-accent transition-colors"
            style={{ minHeight: "unset" }}
          >
            <ChevronRight size={14} className={`transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
            style={{ minHeight: "unset" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group
                  ${isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-sidebar-accent"
                  }`}
                style={{ minHeight: "unset" }}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom profile */}
        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border space-y-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium"
              style={{ minHeight: "unset" }}
            >
              <ExternalLink size={14} />
              <span>고객 페이지 보기</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">박</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">박서연 사장님</p>
                <p className="text-xs text-white/40 truncate">앙금앤케이크</p>
              </div>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
              style={{ minHeight: "unset" }}
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              style={{ minHeight: "unset" }}
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">박</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
