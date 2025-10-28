declare module "./page-client" {
  import { ComponentType } from "react";
  import { SavedPlan } from "@/lib/types";

  interface SharePageClientProps {
    shareId: string;
    initialPlan: SavedPlan;
    originalUserEmail: string;
  }

  export const SharePageClient: ComponentType<SharePageClientProps>;
}
