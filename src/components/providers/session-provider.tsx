"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0} // do not poll session in background
      refetchOnWindowFocus={false} // do not refresh on focus (prevents silent sign-outs)
    >
      {children}
    </SessionProvider>
  );
}
