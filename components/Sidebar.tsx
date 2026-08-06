"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

type NavItem = { icon: string; label: string; href: string; title?: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [{ icon: "space_dashboard", label: "Overview", href: "/" }],
  },
  {
    label: "Sales",
    items: [
      { icon: "calendar_view_month", label: "Monthly overview", href: "/pipeline" },
      { icon: "account_tree", label: "MyPipeline", href: "/my-pipeline" },
      { icon: "calendar_view_week", label: "Weekly", href: "/weekly" },
      { icon: "flag", label: "MTD & segments", href: "/mtd" },
      { icon: "compare_arrows", label: "WoW reports", href: "/wow" },
    ],
  },
  {
    label: "Account health",
    items: [
      { icon: "storefront", label: "Performance", href: "/accounts-performance" },
      { icon: "calendar_month", label: "Monthly cohorts", href: "/accounts-performance-mom" },
      { icon: "heart_broken", label: "Churn prevention", href: "/churn-prevention" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: "call_received", label: "Inbound team", href: "/inbound" },
      { icon: "support_agent", label: "MOps", href: "/mops" },
    ],
  },
];

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
      className={`fixed left-0 top-0 z-50 flex h-full w-[232px] flex-col border-r border-outline-variant/80 bg-surface-container-lowest transition-transform duration-200 ease-out lg:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
    >
      <div className="flex h-[72px] items-center border-b border-outline-variant/60 px-md">
        <Logo size={32} subtitle="Bolt Food Romania" />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-sm py-md">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-md">
            <p className="mb-xs px-sm text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/65">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={item.title}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex h-10 items-center gap-sm rounded-lg px-sm text-[13px] font-semibold transition-all ${
                      active
                        ? "bg-brand-container text-brand"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                  >
                    {active ? (
                      <span className="absolute -left-sm h-6 w-[3px] rounded-r-full bg-brand" />
                    ) : null}
                    <span
                      className={`material-symbols-outlined text-[19px] ${
                        active ? "text-brand" : "text-on-surface-variant/80 group-hover:text-brand"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-outline-variant/60 p-sm">
        <div className="mb-xs flex items-center justify-center gap-xs rounded-lg bg-surface-container-low px-sm py-xs text-[10px] font-bold">
          <span className="text-won">Won</span>
          <span className="text-on-surface-variant">≠</span>
          <span className="text-activated">Activated</span>
        </div>
        <Link
          href="/settings"
          onClick={onClose}
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={`flex h-10 items-center gap-sm rounded-lg px-sm text-[13px] font-semibold transition-colors ${
            isActive(pathname, "/settings")
              ? "bg-brand-container text-brand"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">settings</span>
          Settings
        </Link>
      </div>
    </nav>
  );
}
