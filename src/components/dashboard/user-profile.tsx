
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
import { LogOut, MapPin, ShieldAlert, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { AddPlaceDialog } from "./add-place-dialog";

export function UserProfile() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userName, setUserName] = useState("Guest");
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const { name } = JSON.parse(userData);
      if (name) {
        setUserName(name);
      }
    }
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem("user");
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };
  
  const handleAddPlace = () => {
    setIsAddPlaceOpen(true);
  };

  const handleReportIssue = () => {
    router.push("/dashboard/report-issue");
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
                <AvatarImage src="" alt={userName} />
                <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAddPlace}>
            <MapPin className="mr-2 h-4 w-4" />
            <span>Add Place</span>
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
      <AddPlaceDialog open={isAddPlaceOpen} onOpenChange={setIsAddPlaceOpen} />
    </>
  );
}
