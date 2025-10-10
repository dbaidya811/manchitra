
"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Map, Newspaper, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation'


export function MobileNav() {
  const pathname = usePathname();
  const getActiveTab = () => {
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/feed')) return 'feed';
    if (pathname.includes('/planning-ai')) return 'plan';
    return 'home';
  }
  const [activeTab, setActiveTab] = useState(getActiveTab());

  const navItems = [
    { id: "home", icon: Home, label: "Home", href: "/dashboard" },
    { id: "map", icon: Map, label: "Map", href: "/dashboard/map" },
    { id: "feed", icon: Newspaper, label: "Feed", href: "/dashboard/feed" },
    { id: "plan", icon: Sparkles, label: "AI Plan", href: "/planning-ai" },
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeTab);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <nav className="relative mx-auto flex max-w-xs items-center justify-around rounded-full bg-background/80 p-2 shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-sm">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "z-10 flex flex-col items-center justify-center gap-1 rounded-full p-2 text-muted-foreground transition-colors w-full",
              activeTab === item.id && "text-white bg-[#22c55e]/40",
            )}
          >
            <item.icon className={cn(
              "h-6 w-6 transition-colors",
              activeTab === item.id ? "text-white" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xs font-medium transition-colors",
              activeTab === item.id ? "text-white" : "text-muted-foreground"
            )}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </footer>
  );
}
