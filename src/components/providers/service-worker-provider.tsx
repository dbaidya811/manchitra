"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SW_PATH = "/sw.js";

export function ServiceWorkerProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Check if app is already installed or user dismissed prompt
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('appInstallDismissed') === 'true';

    if (isInstalled || dismissed) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show dialog after a short delay
      setTimeout(() => {
        setShowInstallDialog(true);
      }, 1000); // 1 second delay
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    register();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      (deferredPrompt as any).userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
        setShowInstallDialog(false);
      });
    }
  };

  const handleDismiss = () => {
    setShowInstallDialog(false);
    localStorage.setItem('appInstallDismissed', 'true');
  };

  return (
    <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader className="items-center text-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary">
            <Image src="/icon-192x192.png" alt="Manchitra logo" width={48} height={48} className="rounded-xl" priority />
          </div>
          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-lg font-semibold">Manchitra</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">App size: 512 KB</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="flex w-full flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss} className="w-full">
            Not Now
          </Button>
          <Button onClick={handleInstallClick} className="w-full">
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
