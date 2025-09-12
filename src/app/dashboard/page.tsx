"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <h1 className="font-headline text-xl font-bold">Manchitra</h1>
        </div>
        <UserProfile />
      </header>
      <main className="flex-1 p-4 md:p-6">
        {/* This is where the blank dashboard content will go */}
      </main>
      <MobileNav />
    </div>
  );
}
