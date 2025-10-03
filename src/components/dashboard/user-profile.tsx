"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, MapPin, ShieldAlert, Heart, Eye, AlertTriangle, Share2, ClipboardCopy, PhoneCall, History as HistoryIcon, Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { AddPlaceDialog } from "./add-place-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Place } from "@/lib/types";
import { useSession, signOut } from "next-auth/react";
import { Loader } from "@/components/ui/loader";

interface UserProfileProps {
  onPlaceSubmit?: (place: Omit<Place, 'id' | 'tags' | 'lat' | 'lon'>) => void;
}

// Slide-to-confirm call control
const SlideToCall: React.FC<{ label: string; onConfirm: () => void }> = ({ label, onConfirm }) => {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging || !trackRef.current) return;
      const track = trackRef.current.getBoundingClientRect();
      const clientX = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const handleWidth = 56;
      let x = Math.max(0, Math.min(clientX - track.left - 28, track.width - handleWidth));
      setDragX(x);
    };
    const onUp = () => {
      if (!dragging || !trackRef.current) return;
      const track = trackRef.current.getBoundingClientRect();
      const handleWidth = 56;
      const threshold = (track.width - handleWidth) * 0.75;
      if (dragX >= threshold) onConfirm();
      setDragging(false);
      setDragX(0);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove as any, { passive: false } as any);
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove as any);
      document.removeEventListener('touchend', onUp);
    };
  }, [dragging, dragX, onConfirm]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div className="select-none">
      <div ref={trackRef} className="relative h-12 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 shadow-inner overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center px-24 sm:px-20">
          <span className="text-white font-semibold text-xs sm:text-sm tracking-normal text-center">{label}</span>
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 h-10 w-14 rounded-xl bg-white text-red-600 grid place-items-center shadow-lg border border-red-200 active:scale-95"
          style={{ left: 8 + dragX }}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          role="button"
          aria-label="Slide to call"
        >
          <PhoneCall className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-1 text-[10px] text-center text-muted-foreground">Slide right to call</div>
    </div>
  );
};

export function UserProfile({ onPlaceSubmit }: UserProfileProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [guestName, setGuestName] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [guestImage, setGuestImage] = useState<string>("");

  const isLoading = status === "loading";
  useEffect(() => {
    // Fallback for Guest login: read name/email from localStorage set by OTP flow
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored) as { name?: string; email?: string; image?: string };
        setGuestName(parsed.name || "");
        setGuestEmail(parsed.email || "");
        setGuestImage(parsed.image || "");
      } else {
        setGuestName("");
        setGuestEmail("");
        setGuestImage("");
      }
    } catch (_) {
      // ignore parse errors
    }
  }, [status]);

  const userName = isLoading ? "Loading..." : (session?.user?.name || guestName || "Guest");
  const userEmail = isLoading ? "" : (session?.user?.email || guestEmail || "");
  const userImage = isLoading ? "" : (session?.user?.image || guestImage || "");

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Clear any local data if you still use it
    localStorage.removeItem("user-places");
    localStorage.removeItem("user");
    // Sign out via NextAuth and return to home
    signOut({ callbackUrl: "/" });
  };
  
  const handleAddPlace = () => {
    setIsAddPlaceOpen(true);
  };

  const handleReportIssue = () => {
    router.push("/dashboard/report-issue");
  };

  const handleContributions = () => {
    router.push("/dashboard/my-contributions");
  };
  
  const handleWhatIHaveSeen = () => {
    router.push("/dashboard/what-have-i-seen");
  };
  const handleHistory = () => {
    router.push("/dashboard/history");
  };

  // SOS utilities
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
  };
  const sosCall = () => { window.location.href = "tel:112"; };
  const sosCallNumber = (num: string) => { window.location.href = `tel:${num}`; };
  const sosShare = async () => {
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
    } catch {
      toast({ title: "Share failed", description: "Could not share right now.", variant: "destructive" });
    }
  };
  const sosWhatsApp = async () => {
    const coords = await getLocation();
    const url = buildMapsLink(coords);
    const txt = encodeURIComponent(`SOS: I need help. My current location: ${url}`);
    window.open(`https://wa.me/?text=${txt}`, "_blank");
  };
  const sosCopy = async () => {
    const coords = await getLocation();
    const url = buildMapsLink(coords);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied", description: "Location link copied to clipboard." });
    } catch {}
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 shadow-md hover:shadow-lg transition"
          >
            <div className="rounded-full p-0.5 ring-2 ring-primary/90 bg-white/70 dark:bg-black/50 backdrop-blur">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={userImage}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // If the image fails (network/CORS), blank it so fallback renders
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = '';
                  }}
                />
                <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-2xl p-2" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{userName}</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem onClick={() => setIsSosOpen(true)} className="rounded-lg px-3 py-2.5 text-sm transition-none group hover:bg-gradient-to-r hover:from-emerald-500 hover:to-sky-500 hover:text-white data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-emerald-500 data-[highlighted]:to-sky-500 data-[highlighted]:text-white">
            <AlertTriangle className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-data-[highlighted]:text-white" />
            <span className="group-hover:text-white group-data-[highlighted]:text-white">SOS</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddPlace} className="rounded-lg px-3 py-2.5 text-sm transition-none group hover:bg-gradient-to-r hover:from-emerald-500 hover:to-sky-500 hover:text-white data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-emerald-500 data-[highlighted]:to-sky-500 data-[highlighted]:text-white">
            <MapPin className="mr-2 h-4 w-4 text-orange-600 group-hover:text-white group-data-[highlighted]:text-white" />
            <span className="group-hover:text-white group-data-[highlighted]:text-white">Add Place</span>
          </DropdownMenuItem>
          {(() => {
            const activeCls = "bg-gradient-to-r from-emerald-500 to-sky-500 text-white";
            const hoverGrad = "hover:bg-gradient-to-r hover:from-emerald-500 hover:to-sky-500 hover:text-white data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-emerald-500 data-[highlighted]:to-sky-500 data-[highlighted]:text-white";
            const baseCls = `rounded-lg px-3 py-2.5 text-sm transition-none ${hoverGrad}`;
            const isContrib = pathname === "/dashboard/my-contributions";
            const isSeen = pathname === "/dashboard/what-have-i-seen";
            const isReport = pathname === "/dashboard/report-issue";
            const isHistory = pathname === "/dashboard/history";
            return (
              <>
                <DropdownMenuItem onClick={handleContributions} className={`${baseCls} ${isContrib ? activeCls : ""} group`}>
                  <Heart className={`mr-2 h-4 w-4 ${isContrib ? "text-white" : "text-rose-600 group-hover:text-white group-data-[highlighted]:text-white"}`} />
                  <span className={`${isContrib ? "text-white" : "group-hover:text-white group-data-[highlighted]:text-white"}`}>My Contributions</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleWhatIHaveSeen} className={`${baseCls} ${isSeen ? activeCls : ""} group`}>
                  <Eye className={`mr-2 h-4 w-4 ${isSeen ? "text-white" : "text-emerald-600 group-hover:text-white group-data-[highlighted]:text-white"}`} />
                  <span className={`${isSeen ? "text-white" : "group-hover:text-white group-data-[highlighted]:text-white"}`}>Watchlist</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleHistory} className={`${baseCls} ${isHistory ? activeCls : ""} group`}>
                  <HistoryIcon className={`mr-2 h-4 w-4 ${isHistory ? "text-white" : "text-sky-600 group-hover:text-white group-data-[highlighted]:text-white"}`} />
                  <span className={`${isHistory ? "text-white" : "group-hover:text-white group-data-[highlighted]:text-white"}`}>History</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReportIssue} className={`${baseCls} ${isReport ? activeCls : ""} group`}>
                  <ShieldAlert className={`mr-2 h-4 w-4 ${isReport ? "text-white" : "text-amber-600 group-hover:text-white group-data-[highlighted]:text-white"}`} />
                  <span className={`${isReport ? "text-white" : "group-hover:text-white group-data-[highlighted]:text-white"}`}>Report Issue</span>
                </DropdownMenuItem>
              </>
            );
          })()}
          <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="rounded-lg px-3 py-2.5 text-sm transition-none group hover:bg-gradient-to-r hover:from-emerald-500 hover:to-sky-500 hover:text-white data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-emerald-500 data-[highlighted]:to-sky-500 data-[highlighted]:text-white disabled:opacity-70">
            {isLoggingOut ? (
              <span className="mr-2 inline-flex"><Loader size="sm" /></span>
            ) : (
              <LogOut className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-data-[highlighted]:text-white" />
            )}
            <span className="group-hover:text-white group-data-[highlighted]:text-white">{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddPlaceDialog open={isAddPlaceOpen} onOpenChange={setIsAddPlaceOpen} onPlaceSubmit={onPlaceSubmit} />

      {/* SOS Dialog */}
      <Dialog open={isSosOpen} onOpenChange={setIsSosOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Emergency SOS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SlideToCall label="Emergency" onConfirm={sosCall} />
            <Button onClick={sosShare} className="w-full bg-orange-500 hover:bg-orange-600">
              <Share2 className="h-4 w-4 mr-2" /> Share current location
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={sosWhatsApp}
                className="h-10 w-full justify-center rounded-xl bg-[#25D366] hover:bg-[#21c15c] text-white border-0"
              >
                <Share2 className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button
                onClick={sosCopy}
                className="h-10 w-full justify-center rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white border-0"
              >
                <ClipboardCopy className="h-4 w-4 mr-2" /> Copy link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3.5 w-3.5 mr-1" /> We’ll try to attach your GPS location if permission is granted.</p>

            {/* Quick Emergency Numbers (slide to confirm) */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <SlideToCall label="Police" onConfirm={() => sosCallNumber('100')} />
              <SlideToCall label="Fire" onConfirm={() => sosCallNumber('101')} />
              <SlideToCall label="Traffic" onConfirm={() => sosCallNumber('1073')} />
              <SlideToCall label="Cyber Crime" onConfirm={() => sosCallNumber('1930')} />
              <SlideToCall label="Women Helpline" onConfirm={() => sosCallNumber('1091')} />
              <SlideToCall label="Child" onConfirm={() => sosCallNumber('1098')} />
              <SlideToCall label="Missing (Helpline)" onConfirm={() => sosCallNumber('9163737373')} />
              <SlideToCall label="Missing (Police)" onConfirm={() => sosCallNumber('22141835')} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
