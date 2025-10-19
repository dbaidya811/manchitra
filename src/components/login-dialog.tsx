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
import { User as UserIcon, Mail } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { signIn } from "next-auth/react";
import { useSessionRefresh } from "@/hooks/use-session-refresh";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshSession } = useSessionRefresh();
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
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }

      setStep(2);
      toast({
        title: "OTP Sent",
        description: "We have emailed a 6-digit OTP to your inbox. Please check your email and enter the code here.",
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

  const handleLogin = async (code?: string) => {
    const otpToUse = (code ?? otp).trim();
    if (!email || otpToUse.length !== 6) return;
    setIsVerifying(true);
    try {
      const result = await signIn("credentials", {
        email,
        otp: otpToUse,
        callbackUrl: "/dashboard",
        redirect: false,
      });
      if (result?.error) {
        throw new Error(result.error);
      }

      toast({ title: "Success", description: "Welcome back! Redirecting now." });
      resetFlow();
      
      // Redirect to dashboard
      try { localStorage.setItem('just-logged-in', '1'); } catch {}
      window.location.href = "/dashboard";
      
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Login failed", variant: "destructive" });
    } finally {
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
      <DialogContent className="sm:max-w-[500px] rounded-3xl bg-white/85 dark:bg-neutral-900/70 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-300/25 via-orange-300/20 to-rose-300/25 px-6 py-5">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-rose-500 bg-clip-text text-transparent">Login Email</DialogTitle>
            <DialogDescription className="text-neutral-700 dark:text-neutral-200">
            {step === 1
              ? "Enter your details to receive an OTP."
              : "Enter the OTP sent to your email."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${step===1? 'bg-orange-500 text-white' : 'bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-200'}`}>Step 1</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${step===2? 'bg-orange-500 text-white' : 'bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-200'}`}>Step 2</span>
          </div>
        </div>
        <div className="space-y-4 px-6 py-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-neutral-800 dark:text-neutral-200">
                  Name
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input id="name" placeholder="Enter your name" className="pl-9 bg-white/70 dark:bg-white/10 border-black/10 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-800 dark:text-neutral-200">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-9 bg-white/70 dark:bg-white/10 border-black/10 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">We’ll only use your email to send the OTP. No spam, promise.</p>
            </>
          )}
          {step === 2 && (
             <div className="space-y-2">
                <Label htmlFor="otp" className="text-neutral-800 dark:text-neutral-200">
                  OTP
                </Label>
                <Input
                  id="otp"
                  placeholder="Enter your OTP"
                  className="bg-white/70 dark:bg-white/10 border-black/10 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 rounded-xl tracking-[0.35em] text-center focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  value={otp}
                  inputMode="numeric"
                  autoFocus
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(v);
                    if (v.length === 6 && !isVerifying) {
                      // Auto-submit when 6 digits entered
                      handleLogin(v);
                    }
                  }}
                />
              </div>
          )}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0 px-6 pb-6">
          {step === 1 && (
            <Button onClick={handleGetOtp} disabled={isSendingOtp} className="w-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-500 hover:via-orange-600 hover:to-rose-600 text-white font-semibold shadow-lg shadow-orange-500/25">
              {isSendingOtp && <Loader size="sm" />}
              Get OTP
            </Button>
          )}
           {step === 2 && (
            <>
                <Button variant="outline" onClick={() => setStep(1)} className="w-full rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-800 dark:text-white border border-black/10 dark:border-white/15">Back</Button>
                <Button onClick={() => handleLogin()} disabled={isVerifying} className="w-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-500 hover:via-orange-600 hover:to-rose-600 text-white font-semibold shadow-lg shadow-orange-500/25">
                   {isVerifying && <Loader size="sm" />}
                   Go to Dashboard
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
