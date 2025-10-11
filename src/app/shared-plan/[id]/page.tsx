"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Clock, Save, UserPlus, LogIn } from "lucide-react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useToast } from "@/hooks/use-toast";
import { SharedPlan } from "@/lib/types";

export default function SharedPlanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const planId = params?.id as string;

  useEffect(() => {
    if (planId) {
      loadSharedPlan(planId);
    }
  }, [planId]);

  const loadSharedPlan = async (id: string) => {
    try {
      const res = await fetch(`/api/shared-plan/${id}`);
      const data = await res.json();

      if (data?.plan) {
        setPlan({
          ...data.plan,
          sharedBy: data.plan.sharedBy || "Anonymous User"
        });
      } else {
        toast({
          title: "Error",
          description: "Plan not found or has been removed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Failed to load shared plan:", error);
      toast({
        title: "Error",
        description: "Failed to load shared plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please login to save this plan",
        variant: "destructive"
      });
      return;
    }

    if (!plan) return;

    setSaving(true);
    try {
      const userEmail = session.user?.email;
      if (!userEmail) {
        toast({
          title: "Error",
          description: "User email not found",
          variant: "destructive"
        });
        return;
      }

      // Check if plan already exists for this user
      const checkRes = await fetch("/api/saved-plans", { cache: "no-store" });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const existingPlans = checkData.plans || [];
        const existingPlan = existingPlans.find((p: any) => p.name === plan.name && p.destinations.join(',') === plan.destinations.join(','));

        if (existingPlan) {
          toast({
            title: "Plan Already Exists",
            description: "This plan is already in your saved plans",
          });
          setSaving(false);
          return;
        }
      }

      // Create a new plan based on the shared plan
      const newPlan = {
        name: plan.name,
        description: plan.description,
        destinations: plan.destinations,
      };

      // Save to backend
      const res = await fetch("/api/saved-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });

      if (!res.ok) {
        throw new Error(`Failed to save plan (${res.status})`);
      }

      toast({
        title: "Plan Saved!",
        description: `"${plan.name}" has been saved to your account and can be accessed from any device`,
      });

      // Redirect to plan save page after a short delay
      setTimeout(() => {
        router.push('/dashboard/plan-save');
      }, 1500);
    } catch (error) {
      console.error("Failed to save plan:", error);
      toast({
        title: "Error",
        description: "Failed to save plan",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = () => {
    router.push('/auth/signin');
  };

  const handleSignup = () => {
    router.push('/auth/signup');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading shared plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <Card className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-red-400 to-orange-400 opacity-80" />
            <h3 className="text-lg font-semibold mb-2">Plan Not Found</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              The shared plan you're looking for doesn't exist or has been removed.
            </p>
            <Button
              onClick={() => router.push('/dashboard/plan-save')}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              Go to Plan Save
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Glass header */}
      <header className="absolute top-3 left-3 right-3 z-[2000] flex h-14 items-center justify-between gap-3 px-3 md:px-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-full"
            aria-label="Go back"
          >
            ←
          </Button>
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl md:text-2xl font-bold text-transparent drop-shadow-sm">
            Shared Plan
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <span className="text-sm text-neutral-600">Welcome, {session.user?.name}</span>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleLogin}>
                <LogIn className="h-4 w-4 mr-1" />
                Login
              </Button>
              <Button size="sm" onClick={handleSignup}>
                <UserPlus className="h-4 w-4 mr-1" />
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="relative flex-1 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
        <div className="mx-auto w-full max-w-2xl">
          <Card className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5 text-orange-500" />
                {plan.name}
              </CardTitle>
              {plan.sharedBy && (
                <p className="text-sm text-neutral-500">
                  Shared by {plan.sharedBy}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {plan.description && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {plan.description}
                  </p>
                </div>
              )}

              {plan.destinations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Destinations:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 min-w-0">
                    {plan.destinations.slice(0, 4).map((destination, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex-shrink-0"
                      >
                        <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{String(destination)}</span>
                      </div>
                    ))}
                    {plan.destinations.length > 4 && (
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                        <span className="text-xs sm:text-sm font-medium">+{plan.destinations.length - 4} more</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created: {formatDate(plan.createdAt)}
                  </div>
                  {plan.updatedAt !== plan.createdAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated: {formatDate(plan.updatedAt)}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                {session ? (
                  <Button
                    onClick={handleSavePlan}
                    disabled={saving}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save to My Plans"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-center text-neutral-600">
                      Login to save this plan to your account and access it across all your devices
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleLogin}
                        className="flex-1 rounded-xl"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                      <Button
                        onClick={handleSignup}
                        className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Sign Up
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <div className="relative z-[2000]">
        <MobileNav />
      </div>
    </div>
  );
}
