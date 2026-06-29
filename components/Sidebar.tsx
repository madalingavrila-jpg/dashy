"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const navItems = [
  { icon: "dashboard", label: "Overview", href: "/" },
  { icon: "groups", label: "Teams", href: "/pipeline" },
  { icon: "account_tree", label: "MyPipeline", href: "/my-pipeline" },
  { icon: "call_received", label: "Inbound team", href: "/inbound" },
  { icon: "calendar_view_week", label: "Weekly", href: "/weekly" },
  { icon: "flag", label: "MTD & Tiers", href: "/mtd" },
  { icon: "compare_arrows", label: "WoW Reports", href: "/wow" },
  { icon: "storefront", label: "Accounts performance", href: "/accounts-performance" },
  { icon: "calendar_month", label: "Accounts performance MOM", href: "/accounts-performance-mom" },
  { icon: "support_agent", label: "MOPS", href: "/mops" },
];

const bottomItems = [{ icon: "settings", label: "Settings", href: "/settings" }];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  // Match the exact route or a nested sub-route (next char is "/"), so sibling
  // prefixes like /accounts-performance vs /accounts-performance-mom stay distinct.
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-outline-variant bg-surface-container-lowest py-md px-xs transition-transform duration-200 ease-out lg:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
    >
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
              onClick={onClose}
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
              onClick={onClose}
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
