"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft } from "lucide-react";
import { UserProfile } from "@/components/dashboard/user-profile";
import { SavedPlan, CalendarPlan, PlanDestination } from "@/lib/types";
import { ModernCalendar } from "@/components/modern-calendar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function PlanSavePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isDeletingPlan, setIsDeletingPlan] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SavedPlan | null>(null);

  const isAuthenticated = status === "authenticated" && !!session?.user?.email;

  console.log('🔐 Authentication status:', {
    status,
    session: session ? {
      user: session.user ? {
        email: session.user.email,
        name: session.user.name
      } : null
    } : null,
    isAuthenticated
  });

  const sortPlans = useCallback((items: SavedPlan[]) => {
    return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);

  const applyPlans = useCallback((items: SavedPlan[]) => {
    setPlans(sortPlans(items));
  }, [sortPlans]);

  const persistLocalPlans = useCallback((updater: SavedPlan[] | ((prev: SavedPlan[]) => SavedPlan[])) => {
    setPlans(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const sorted = sortPlans(next);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("saved-plans", JSON.stringify(sorted));
        } catch (error) {
          console.error("Failed to save plans locally", error);
          setTimeout(() => {
            toast({
              title: "Storage Error",
              description: "Failed to save plans locally. Please clear some space and try again.",
              variant: "destructive",
            });
          }, 0);
        }
      }

      return sorted;
    });
  }, [sortPlans, toast]);

  const upsertLocalPlan = useCallback((plan: SavedPlan) => {
    persistLocalPlans(prev => {
      const existingIndex = prev.findIndex(existing => existing.id === plan.id);
      if (existingIndex === -1) {
        return [...prev, plan];
      }
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...plan };
      return next;
    });
  }, [persistLocalPlans]);

  const removeLocalPlan = useCallback((planId: string) => {
    persistLocalPlans(prev => prev.filter(existing => existing.id !== planId));
  }, [persistLocalPlans]);

  const addPlanToState = useCallback((plan: SavedPlan) => {
    setPlans(prev => sortPlans([...prev.filter(existing => existing.id !== plan.id), plan]));
  }, [sortPlans]);

  const removePlanFromState = useCallback((planId: string) => {
    setPlans(prev => prev.filter(existing => existing.id !== planId));
  }, []);

  const loadLocalPlans = useCallback((): SavedPlan[] => {
    if (typeof window === "undefined") return [];

    try {
      const raw = localStorage.getItem("saved-plans");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const normalized = parsed.map((plan: any) => ({
        ...plan,
        destinations: Array.isArray(plan?.destinations)
          ? plan.destinations.map((dest: any) => {
              if (typeof dest === "string") {
                return { displayName: dest, lat: 0, lon: 0 };
              }
              return {
                displayName: dest.displayName || dest.name || "",
                lat: dest.lat || 0,
                lon: dest.lon || 0,
                area: dest.area
              };
            }).filter(Boolean)
          : [],
      }));

      return sortPlans(normalized as SavedPlan[]);
    } catch (error) {
      console.error("Failed to load plans from local storage", error);
      return [];
    }
  }, [sortPlans]);

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);

    try {
      console.log('📥 Loading plans from database for user:', session?.user?.email);
      const res = await fetch("/api/saved-plans", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch saved plans (${res.status})`);
      }
      const data = await res.json();
      const serverPlans = Array.isArray(data?.plans) ? (data.plans as SavedPlan[]) : [];
      console.log('📥 Loaded plans from database:', serverPlans.length);
      applyPlans(serverPlans);
      if (typeof window !== "undefined") {
        localStorage.removeItem("saved-plans");
      }
    } catch (error) {
      console.error("Failed to fetch plans from server", error);
      const fallback = loadLocalPlans();
      if (fallback.length > 0) {
        applyPlans(fallback);
      } else {
        setPlans([]);
      }
    } finally {
      setIsLoadingPlans(false);
    }
  }, [applyPlans, loadLocalPlans, session?.user?.email]);

  const deletePlan = useCallback(async (plan: SavedPlan) => {
    const planId = plan.id;
    setIsDeletingPlan(planId);

    if (!isAuthenticated) {
      removeLocalPlan(planId);
      toast({
        title: "Plan Deleted",
        description: `"${plan.name}" has been removed locally`,
      });
      setPlanToDelete(null);
      setIsDeletingPlan(null);
      return;
    }

    try {
      removePlanFromState(planId);

      const res = await fetch(`/api/saved-plans?id=${planId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        if (res.status === 401) {
          removeLocalPlan(planId);
          toast({
            title: "Plan Deleted",
            description: `"${plan.name}" has been removed locally`,
          });
          return;
        }

        if (res.status === 404) {
          removeLocalPlan(planId);
          toast({
            title: "Plan Removed",
            description: `"${plan.name}" was only stored locally and has been cleared.`,
          });
          return;
        }

        addPlanToState(plan);
        toast({
          title: "Delete Failed",
          description: errorData?.error === "server_error"
            ? "The server encountered an issue while deleting the plan. Please try again later."
            : `We couldn't reach the server. "${plan.name}" is still in your saved plans. Please try again later.`,
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();
      if (data.ok) {
        await loadPlans();
        toast({
          title: "Plan Deleted",
          description: `"${plan.name}" has been removed`,
        });
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
      addPlanToState(plan);
      toast({
        title: "Error",
        description: "Failed to delete plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPlan(null);
      setPlanToDelete(null);
    }
  }, [addPlanToState, isAuthenticated, loadPlans, removeLocalPlan, removePlanFromState, toast]);


  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!isAuthenticated) {
      console.log('🔐 User not authenticated, redirecting to login');
      router.push('/?login_required=1');
      return;
    }

    loadPlans();
  }, [isAuthenticated, status, router]);

  const isDateInPast = useCallback((value: string | Date) => {
    const candidate = new Date(value);
    if (Number.isNaN(candidate.getTime())) {
      return false;
    }
    candidate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return candidate < today;
  }, []);

  // Calendar handlers
  const normalizeDestinations = useCallback((destinations: PlanDestination[]): PlanDestination[] => {
    return destinations.map(dest => ({
      displayName: dest.displayName || "",
      lat: dest.lat,
      lon: dest.lon,
      area: dest.area,
    }));
  }, []);

  const calendarPlanToSavedPlan = useCallback((plan: CalendarPlan): SavedPlan => {
    return {
      id: plan.id,
      name: plan.title,
      description: plan.description,
      destinations: normalizeDestinations(plan.destinations || []),
      createdAt: plan.createdAt ?? Date.now(),
      updatedAt: plan.updatedAt ?? Date.now(),
    };
  }, [normalizeDestinations]);

  const handleCalendarPlanAdd = async (plan: CalendarPlan) => {
    if (plan.date && isDateInPast(plan.date)) {
      toast({
        title: "Invalid Date",
        description: "Plans cannot be saved for past dates.",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      const savedPlan = calendarPlanToSavedPlan(plan);
      upsertLocalPlan(savedPlan);
      toast({
        title: "Plan Added",
        description: `"${plan.title}" has been saved locally for ${new Date(plan.date).toLocaleDateString()}`,
      });
      return;
    }

    try {
      const optimisticPlan = calendarPlanToSavedPlan(plan);
      addPlanToState(optimisticPlan);

      const requestBody = {
        id: plan.id,
        name: plan.title,
        description: plan.description,
        destinations: normalizeDestinations(plan.destinations || []),
      };

      console.log('📤 Sending plan to API:', {
        isAuthenticated,
        email: session?.user?.email,
        requestBody
      });

      const res = await fetch("/api/saved-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const responseData = await res.json();
      console.log('📥 API Response:', {
        status: res.status,
        ok: res.ok,
        data: responseData
      });

      if (!res.ok) {
        if (res.status === 401) {
          const savedPlan = calendarPlanToSavedPlan(plan);
          upsertLocalPlan(savedPlan);
          toast({
            title: "Plan Added",
            description: `"${plan.title}" has been saved locally for ${new Date(plan.date).toLocaleDateString()}`,
          });
          return;
        }
        const savedPlan = calendarPlanToSavedPlan(plan);
        upsertLocalPlan(savedPlan);
        toast({
          title: "Server Unavailable",
          description: `"${plan.title}" was saved locally. We'll sync it once the server is back.`,
        });
        return;
      }

      const data = await res.json();
      if (data.ok) {
        // Refresh plans from database
        await loadPlans();
        toast({
          title: "Plan Added",
          description: `"${plan.title}" has been added for ${new Date(plan.date).toLocaleDateString()}`,
        });
      }
    } catch (error) {
      console.error("Failed to save plan:", error);
      const savedPlan = calendarPlanToSavedPlan(plan);
      upsertLocalPlan(savedPlan);
      toast({
        title: "Plan Saved Locally",
        description: `We couldn't reach the server. "${plan.title}" was stored locally.`,
      });
    }
  };

  const handleCalendarPlanUpdate = async (plan: CalendarPlan) => {
    if (!isAuthenticated) {
      const updatedPlan = calendarPlanToSavedPlan(plan);
      upsertLocalPlan(updatedPlan);
      toast({
        title: "Plan Updated",
        description: `"${plan.title}" has been updated locally`,
      });
      return;
    }

    try {
      const updatedPlan = calendarPlanToSavedPlan(plan);
      addPlanToState(updatedPlan);

      const res = await fetch("/api/saved-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          name: plan.title,
          description: plan.description,
          destinations: normalizeDestinations(plan.destinations || []),
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          const updatedPlan = calendarPlanToSavedPlan(plan);
          upsertLocalPlan(updatedPlan);
          toast({
            title: "Plan Updated",
            description: `"${plan.title}" has been updated locally`,
          });
          return;
        }
        const updatedPlan = calendarPlanToSavedPlan(plan);
        upsertLocalPlan(updatedPlan);
        toast({
          title: "Server Unavailable",
          description: `"${plan.title}" was updated locally. We'll sync it once the server is back.`,
        });
        return;
      }

      const data = await res.json();
      if (data.ok) {
        // Refresh plans from database
        await loadPlans();
        toast({
          title: "Plan Updated",
          description: `"${plan.title}" has been updated`,
        });
      }
    } catch (error) {
      console.error("Failed to update plan:", error);
      const updatedPlan = calendarPlanToSavedPlan(plan);
      upsertLocalPlan(updatedPlan);
      toast({
        title: "Plan Updated Locally",
        description: `We couldn't reach the server. "${plan.title}" was updated locally.`,
      });
    }
  };

  const handleCalendarPlanDelete = useCallback((planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setPlanToDelete(plan);
  }, [plans]);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      if (isDeletingPlan) return;
      setPlanToDelete(null);
    }
  }, [isDeletingPlan]);

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Glass header */}
      <header className="absolute top-3 left-3 right-3 z-[9999] flex h-14 items-center justify-between gap-3 px-3 md:px-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl md:text-3xl font-extrabold text-transparent drop-shadow-md tracking-tight">
            Plan Save
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>
      </header>

      <main className="relative flex-1 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
        {status === "loading" ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-lg">Checking authentication...</p>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className="text-lg mb-4">Please log in to save and manage your plans</p>
              <Button onClick={() => router.push('/?login_required=1')} className="rounded-xl">
                Login to Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg xl:max-w-2xl">
            {/* Calendar View */}
            <ModernCalendar
              plans={plans}
              isLoading={isLoadingPlans}
              deletingPlanId={isDeletingPlan}
              onPlanAdd={handleCalendarPlanAdd}
              onPlanUpdate={handleCalendarPlanUpdate}
              onPlanDelete={handleCalendarPlanDelete}
            />
          </div>
        )}
      </main>

      <MobileNav />

      <AlertDialog open={!!planToDelete} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent className="max-w-sm rounded-2xl border border-red-200/60 dark:border-red-900/60 bg-white/95 dark:bg-neutral-900/95 backdrop-blur">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-red-600 dark:text-red-400">
              Delete plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {planToDelete ? `"${planToDelete.name}" will be removed from your saved plans. This action cannot be undone.` : "This plan will be removed from your saved plans. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingPlan === planToDelete?.id}
              onClick={() => setPlanToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingPlan === planToDelete?.id}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
              onClick={() => {
                if (planToDelete) {
                  void deletePlan(planToDelete);
                }
              }}
            >
              {isDeletingPlan === planToDelete?.id ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
