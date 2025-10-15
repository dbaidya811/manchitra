"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Navigation, Route as RouteIcon } from "lucide-react";

interface RouteStep {
  title: string;
  detail?: string;
}

interface RouteStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeName: string;
  steps: RouteStep[];
}

export function RouteStepsDialog({ open, onOpenChange, placeName, steps }: RouteStepsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <RouteIcon className="h-5 w-5 text-orange-500" />
            Route to {placeName}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="max-h-80 overflow-auto pr-1">
            <ol className="space-y-4">
              {steps.map((s, i) => {
                const isLast = i === steps.length - 1;
                return (
                  <li key={i} className="grid grid-cols-[24px_1fr] gap-3">
                    {/* Left timeline + number bubble */}
                    <div className="relative flex justify-center">
                      <span className="z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {!isLast && (
                        <span className="pointer-events-none absolute top-5 bottom-[-14px] w-[2px] bg-orange-200" />
                      )}
                    </div>
                    {/* Step content */}
                    <div>
                      <div className="font-semibold text-sm text-foreground">{s.title}</div>
                      {s.detail && (
                        <div className="text-xs mt-0.5 text-muted-foreground">{s.detail}</div>
                      )}
                    </div>
                  </li>
                );
              })}
              {/* Arrival item */}
              <li className="grid grid-cols-[24px_1fr] gap-3">
                <div className="relative flex justify-center">
                  <span className="z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm">You have arrived at {placeName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5" /> Enjoy your visit!
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
