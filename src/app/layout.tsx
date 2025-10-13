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
// import { FloatingSOS } from "@/components/dashboard/floating-sos";


export const metadata: Metadata = {
  title: "Manchitra - your hoping patner",
  description: "Visually build and customize your website with AI-powered content suggestions.",
  icons: {
    icon: "/favicon.png",
    apple: "/icon-192x192.png",
    shortcut: "/favicon.png"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
         <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Favicon (external PNG) */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#f59e0b" />
      </head>
      <body className={cn("font-body antialiased")}>
        <AuthSessionProvider>
          <UrlCleanerProvider>
            <ServiceWorkerProvider />
            {children}
            <Toaster />
            <FetchSpinner />
            <NavigationSpinner />
          </UrlCleanerProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
