"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [activeTab, setActiveTab] = useState("home");

  const navItems = [
    { id: "home", icon: Home, label: "Home", href: "/dashboard" },
    { id: "map", icon: Map, label: "Map", href: "#" }, // Assuming map page doesn't exist yet
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 md:hidden">
      <div className="relative mx-auto flex h-16 max-w-sm items-center justify-around rounded-2xl bg-secondary/80 backdrop-blur-sm">
        {navItems.map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setActiveTab(item.id)}
            className="z-10 flex flex-col items-center justify-center gap-1 text-center text-secondary-foreground"
          >
            <item.icon
              className={cn(
                "h-6 w-6 transition-transform",
                activeTab === item.id ? "scale-110" : ""
              )}
            />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        <div
          className="absolute top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-background/80 shadow-inner transition-all duration-300 ease-out animate-nav-slide"
          style={{
            left: `${
              navItems.findIndex((item) => item.id === activeTab) * 50
            }%`,
            transform: `translateX(-50%) translateY(-50%)`,
          }}
        />
      </div>
    </footer>
  );
}
