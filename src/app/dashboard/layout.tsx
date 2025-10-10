import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    const callback = encodeURIComponent('/dashboard');
    redirect(`/api/auth/signin?callbackUrl=${callback}`);
  }
  return (
    <>
      {children}
      <MobileNav />
    </>
  );
}
