"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-on-surface/40 lg:hidden"
        />
      )}
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
      <main className="min-h-screen pt-[72px] lg:ml-[232px]">
        <div className="px-md py-lg">{children}</div>
      </main>
    </>
  );
}
