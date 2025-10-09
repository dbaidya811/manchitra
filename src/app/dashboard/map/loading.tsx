"use client";

import { Loader } from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Loader />
        <div className="text-sm text-muted-foreground">Loading map…</div>
      </div>
    </div>
  );
}
