"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function WhatHaveISeenPage() {
    const router = useRouter();
    
    return (
        <div className="relative h-screen flex flex-col">
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <div className="flex items-center gap-2 md:flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-xl font-semibold">
                        What I've Seen
                    </h1>
                </div>
                <div className="flex items-center gap-2 justify-end">
                <UserProfile />
                </div>
            </header>
            <main className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-muted-foreground">Map Coming Soon</h2>
                    <p className="text-muted-foreground">This is where your visited locations will be visualized.</p>
                </div>
            </main>
            <MobileNav />
        </div>
    );
}
