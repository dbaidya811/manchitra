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
import { useRouter } from "next/navigation";
import { LogOut, MapPin, ShieldAlert, Loader2, Heart, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { AddPlaceDialog } from "./add-place-dialog";
import { Place } from "@/lib/types";
import { useSession, signOut } from "next-auth/react";

interface UserProfileProps {
  onPlaceSubmit?: (place: Omit<Place, 'id' | 'tags' | 'lat' | 'lon'>) => void;
}

export function UserProfile({ onPlaceSubmit }: UserProfileProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false);
  const [guestName, setGuestName] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");

  const isLoading = status === "loading";
  useEffect(() => {
    // Fallback for Guest login: read name/email from localStorage set by OTP flow
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored) as { name?: string; email?: string };
        setGuestName(parsed.name || "");
        setGuestEmail(parsed.email || "");
      } else {
        setGuestName("");
        setGuestEmail("");
      }
    } catch (_) {
      // ignore parse errors
    }
  }, [status]);

  const userName = isLoading ? "Loading..." : (session?.user?.name || guestName || "Guest");
  const userEmail = isLoading ? "" : (session?.user?.email || guestEmail || "");
  const userImage = isLoading ? "" : (session?.user?.image || "");

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
          <DropdownMenuItem onClick={handleAddPlace} className="rounded-lg px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
            <MapPin className="mr-2 h-4 w-4 text-orange-600" />
            <span>Add Place</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleContributions} className="rounded-lg px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
            <Heart className="mr-2 h-4 w-4 text-rose-600" />
            <span>My Contributions</span>
          </DropdownMenuItem>
           <DropdownMenuItem onClick={handleWhatIHaveSeen} className="rounded-lg px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
            <Eye className="mr-2 h-4 w-4 text-emerald-600" />
            <span>What I've Seen</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReportIssue} className="rounded-lg px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
            <ShieldAlert className="mr-2 h-4 w-4 text-amber-600" />
            <span>Report Issue</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="rounded-lg px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-red-600" />
            ) : (
              <LogOut className="mr-2 h-4 w-4 text-red-600" />
            )}
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddPlaceDialog open={isAddPlaceOpen} onOpenChange={setIsAddPlaceOpen} onPlaceSubmit={onPlaceSubmit} />
    </>
  );
}
