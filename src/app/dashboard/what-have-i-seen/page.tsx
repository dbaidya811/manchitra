"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const WhatHaveISeenMap = dynamic(() => import('@/components/dashboard/what-have-i-seen-map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});


export default function WhatHaveISeenPage() {
    const router = useRouter();
    
    return (
        <div className="relative h-screen">
            <header className="absolute top-0 left-0 right-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 px-4 md:px-6 bg-transparent">
                <div className="flex items-center gap-2 md:flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-background/80 hover:bg-background rounded-full"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-xl font-semibold bg-background/80 px-4 py-2 rounded-lg">
                        What I've Seen
                    </h1>
                </div>
                <div className="flex items-center gap-2 justify-end">
                <UserProfile />
                </div>
            </header>
            <main className="h-full w-full z-10">
                <WhatHaveISeenMap />
            </main>
            <MobileNav />
        </div>
    );
}