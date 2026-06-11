import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <Sidebar />
      <TopBar />
      <main className="ml-[280px] mt-16 p-lg">{children}</main>
    </>
  );
}
