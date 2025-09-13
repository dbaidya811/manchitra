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
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");


  const handleGetOtp = async () => {
    if (!email || !name) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }

      setStep(2);
      toast({
        title: "OTP Sent (Mock)",
        description: `For testing, your OTP is ${data.otp}. In a real app, this would be sent to your email.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleLogin = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed.');
      }
      
      localStorage.setItem("user", JSON.stringify({ name, email }));

      toast({
        title: "Login Successful",
        description: "Welcome to your dashboard!",
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);


    } catch (error: any) {
       toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
       setIsVerifying(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setEmail("");
    setName("");
    setOtp("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if(!isOpen) resetFlow();
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-[425px] bg-white/10 backdrop-blur-lg border-white/20 text-white shadow-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Guest Login</DialogTitle>
          <DialogDescription className="text-white/80">
            {step === 1
              ? "Enter your details to receive an OTP."
              : "Enter the OTP sent to your email."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/90">
                  Name
                </Label>
                <Input id="name" placeholder="Enter your name" className="bg-white/20 border-none placeholder:text-white/70" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/20 border-none placeholder:text-white/70"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}
          {step === 2 && (
             <div className="space-y-2">
                <Label htmlFor="otp" className="text-white/90">
                  OTP
                </Label>
                <Input id="otp" placeholder="Enter your OTP" className="bg-white/20 border-none placeholder:text-white/70" value={otp} onChange={(e) => setOtp(e.target.value)} />
              </div>
          )}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
          {step === 1 && (
            <Button onClick={handleGetOtp} disabled={isSendingOtp} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold">
              {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get OTP
            </Button>
          )}
           {step === 2 && (
            <>
                <Button variant="outline" onClick={() => setStep(1)} className="w-full bg-transparent hover:bg-white/20 text-white">Back</Button>
                <Button onClick={handleLogin} disabled={isVerifying} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold">
                   {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Go to Dashboard
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
