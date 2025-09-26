"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, MapPin, PhoneCall, Share2, ClipboardCopy } from "lucide-react";

export function FloatingSOS() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const getLocation = (): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  };

  const buildMapsLink = (coords: { lat: number; lon: number } | null) => {
    if (!coords) return "https://www.google.com/maps";
    const { lat, lon } = coords;
    return `https://www.google.com/maps?q=${lat},${lon}`;
    // Alternative: `https://maps.google.com/?q=${lat},${lon}`
  };

  const handleCall = () => {
    window.location.href = "tel:112"; // India emergency
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const coords = await getLocation();
      const url = buildMapsLink(coords);
      const text = `SOS: I need help. My current location: ${url}`;
      if (navigator.share) {
        await navigator.share({ title: "SOS", text, url });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "SOS message copied. Paste anywhere to share." });
      }
    } catch (e) {
      toast({ title: "Share failed", description: "Could not share right now.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLocation = async () => {
    setBusy(true);
    try {
      const coords = await getLocation();
      const url = buildMapsLink(coords);
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied", description: "Location link copied to clipboard." });
    } catch (e) {
      toast({ title: "Copy failed", description: "Could not copy.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsApp = async () => {
    setBusy(true);
    try {
      const coords = await getLocation();
      const url = buildMapsLink(coords);
      const txt = encodeURIComponent(`SOS: I need help. My current location: ${url}`);
      window.open(`https://wa.me/?text=${txt}`, "_blank");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="fixed z-[2500] bottom-[calc(5.5rem+20px)] right-4 md:right-6"
        style={{ pointerEvents: "none" }}
      >
        <button
          onClick={() => setOpen(true)}
          className="h-12 w-12 md:h-14 md:w-14 rounded-full grid place-items-center text-white shadow-xl ring-2 ring-white/70 focus:outline-none focus:ring-4 focus:ring-red-300/50 transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,1) 0%, rgba(234,88,12,1) 100%)",
            pointerEvents: "auto",
          }}
          aria-label="SOS"
          title="SOS"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Emergency SOS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button onClick={handleCall} className="w-full bg-red-600 hover:bg-red-700">
              <PhoneCall className="h-4 w-4 mr-2" /> Call 112 (Emergency)
            </Button>
            <Button onClick={handleShare} className="w-full bg-orange-500 hover:bg-orange-600" disabled={busy}>
              <Share2 className="h-4 w-4 mr-2" /> Share current location
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleWhatsApp} variant="secondary" className="w-full">
                <Share2 className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button onClick={handleCopyLocation} variant="outline" className="w-full">
                <ClipboardCopy className="h-4 w-4 mr-2" /> Copy link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3.5 w-3.5 mr-1" /> We’ll try to attach your GPS location if permission is granted.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
