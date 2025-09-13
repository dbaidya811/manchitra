
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const handleGetOtp = () => {
    // This is a mock function. In a real app, you'd call your backend to send an OTP.
    setIsSendingOtp(true);
    setTimeout(() => {
      setIsSendingOtp(false);
      setStep(2);
      toast({
        title: "OTP Sent",
        description: "A one-time password has been sent to your email (for real in production!).",
      });
    }, 1500);
  };

  const handleLogin = () => {
    // This is a mock function. In a real app, you'd verify the OTP.
    router.push("/dashboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center">
          <DialogTitle>Guest Login</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Enter your details to receive an OTP."
              : "Enter the OTP sent to your email."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name
                </Label>
                <Input id="name" placeholder="Enter your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                />
              </div>
            </>
          )}
          {step === 2 && (
             <div className="space-y-2">
                <Label htmlFor="otp">
                  OTP
                </Label>
                <Input id="otp" placeholder="Enter your OTP" />
              </div>
          )}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
          {step === 1 && (
            <Button onClick={handleGetOtp} disabled={isSendingOtp} className="w-full">
              {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get OTP
            </Button>
          )}
           {step === 2 && (
            <>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleLogin}>Go to Dashboard</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
