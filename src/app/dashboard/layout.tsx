import { ReactNode } from "react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardWrapper>
      {children}
      <MobileNav />
    </DashboardWrapper>
  );
}
