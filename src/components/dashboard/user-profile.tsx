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
import { LogOut, MapPin, ShieldAlert } from "lucide-react";

export function UserProfile() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/");
  };
  
  const handleAddPlace = () => {
    router.push("/dashboard/map");
  };

  const handleReportIssue = () => {
    // Placeholder for reporting an issue
    console.log("Report Issue clicked");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <div className="rounded-full p-0.5 ring-2 ring-primary">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt="Guest" />
              <AvatarFallback>G</AvatarFallback>
            </Avatar>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Guest</p>
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
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
