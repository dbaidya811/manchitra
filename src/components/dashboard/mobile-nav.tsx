
"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Map, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation'


export function MobileNav() {
  const pathname = usePathname();
  const getActiveTab = () => {
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/feed')) return 'feed';
    return 'home';
  }
  const [activeTab, setActiveTab] = useState(getActiveTab());

  const navItems = [
    { id: "home", icon: Home, label: "Home", href: "/dashboard" },
    { id: "map", icon: Map, label: "Map", href: "/dashboard/map" },
    { id: "feed", icon: Newspaper, label: "Feed", href: "/dashboard/feed" },
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
              activeTab === item.id && "text-primary-foreground",
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        <div
          className="absolute left-2 top-2 h-[calc(100%-1rem)] w-[calc((100%-1rem)/3)] rounded-full bg-primary"
          style={{
            transform: `translateX(${activeIndex * 100}%)`,
            transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </nav>
    </footer>
  );
}
