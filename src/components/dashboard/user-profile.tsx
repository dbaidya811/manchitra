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
            className="relative h-10 w-10 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <div className="rounded-full p-0.5 ring-2 ring-primary">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAddPlace}>
            <MapPin className="mr-2 h-4 w-4" />
            <span>Add Place</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleContributions}>
            <Heart className="mr-2 h-4 w-4" />
            <span>My Contributions</span>
          </DropdownMenuItem>
           <DropdownMenuItem onClick={handleWhatIHaveSeen}>
            <Eye className="mr-2 h-4 w-4" />
            <span>What I've Seen</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReportIssue}>
            <ShieldAlert className="mr-2 h-4 w-4" />
            <span>Report Issue</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddPlaceDialog open={isAddPlaceOpen} onOpenChange={setIsAddPlaceOpen} onPlaceSubmit={onPlaceSubmit} />
    </>
  );
}
