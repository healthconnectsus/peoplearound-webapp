import { SiteHeader } from "./SiteHeader";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Shared chrome for signed-in pages: a Nextdoor-style left sidebar plus
 * search top bar on desktop, the classic top header on mobile.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <TopBar />
        {children}
      </div>
    </div>
  );
}
