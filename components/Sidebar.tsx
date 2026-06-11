"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const navItems = [
  { icon: "dashboard", label: "Overview", href: "/" },
  { icon: "groups", label: "Teams", href: "/pipeline" },
  { icon: "calendar_view_week", label: "Weekly", href: "/weekly" },
  { icon: "flag", label: "MTD & Tiers", href: "/mtd" },
  { icon: "compare_arrows", label: "WoW Reports", href: "/wow" },
  { icon: "priority_high", label: "Hitlist", href: "/hitlist" },
];

const bottomItems = [{ icon: "settings", label: "Settings", href: "/settings" }];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-outline-variant bg-surface-container-lowest py-md px-xs">
      <div className="mb-lg px-sm">
        <Logo size={40} subtitle="Ultimate Sales Dashboard" />
      </div>

      <div className="mb-md mx-xs rounded-lg border border-outline-variant bg-surface-container-low px-sm py-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Key rule
        </p>
        <p className="text-label-md font-label-md text-on-surface">
          <span className="font-bold text-won">Won</span> ≠{" "}
          <span className="font-bold text-activated">Activated</span>
        </p>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                active
                  ? "mx-xs my-1 flex items-center gap-sm rounded-lg bg-primary px-md py-sm text-label-md font-label-md text-on-primary transition-transform active:scale-[0.98]"
                  : "mx-xs my-1 flex items-center gap-sm rounded-lg px-md py-sm text-label-md font-label-md text-on-surface-variant transition-all hover:bg-surface-container active:scale-[0.98]"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto border-t border-outline-variant pt-md">
        {bottomItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                active
                  ? "mx-xs my-1 flex items-center gap-sm rounded-lg bg-primary px-md py-sm text-label-md font-label-md text-on-primary"
                  : "mx-xs my-1 flex items-center gap-sm rounded-lg px-md py-sm text-label-md font-label-md text-on-surface-variant transition-all hover:bg-surface-container"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
