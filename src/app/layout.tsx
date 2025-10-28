export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { FetchSpinner } from "@/components/providers/fetch-spinner";
import { NavigationSpinner } from "@/components/providers/navigation-spinner";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { UrlCleanerProvider } from "@/components/providers/url-cleaner-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Suspense } from "react";
import { PerfInit } from "@/components/providers/perf-init";

// Optimized font loading with performance hints
const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap", // Prevents invisible text during font load
  variable: "--font-pt-sans",
});

export const metadata: Metadata = {
  title: "Manchitra - your hoping patner",
  description: "Visually build and customize your website with AI-powered content suggestions.",
  icons: {
    icon: "/favicon.png",
    apple: "/icon-192x192.png",
    shortcut: "/favicon.png"
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Manchitra - Smart Navigation Platform",
    description: "Real-time navigation with voice guidance and social features",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn-icons-png.flaticon.com" crossOrigin="" />

        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://router.project-osrm.org" />
        <link rel="dns-prefetch" href="https://emoji-api.com" />

        {/* Optimized font loading */}
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />

        {/* Optimized Leaflet CSS with integrity check */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />

        {/* Performance and security meta tags */}
        <meta name="theme-color" content="#f59e0b" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="X-DNS-Prefetch-Control" content="on" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={cn("font-body antialiased")}>
        <ThemeProvider>
          <AuthSessionProvider>
            <ServiceWorkerProvider />
            <Suspense fallback={<div style={{height:2}} /> }>
              <UrlCleanerProvider>
                {children}
                <NavigationSpinner />
              </UrlCleanerProvider>
            </Suspense>
            <Toaster />
            <FetchSpinner />
          </AuthSessionProvider>
        </ThemeProvider>

        {/* Initialize performance monitoring on client */}
        <PerfInit />
      </body>
    </html>
  );
}
