"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Plus, Eye } from "lucide-react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { SharedPlan } from "@/lib/types";

export default function SharedPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SharedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedPlans();
  }, []);

  const loadSharedPlans = async () => {
    try {
      const response = await fetch('/api/shared-plan');
      const data = await response.json();

      if (response.ok && data.plans) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error loading shared plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading shared plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Glass header */}
      <header className="absolute top-3 left-3 right-3 z-[2000] flex h-14 items-center justify-between gap-3 px-3 md:px-4 rounded-2xl border-2 border-orange-400/30 dark:border-orange-500/30 bg-white/80 dark:bg-black/50 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl md:text-3xl font-extrabold text-transparent drop-shadow-md tracking-tight">
            Shared Plans
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push('/dashboard/create-shared-plan')}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Plan
          </Button>
        </div>
      </header>

      <main className="relative flex-1 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
        <div className="mx-auto w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl">
          {plans.length === 0 ? (
            <Card className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg mx-auto max-w-sm">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 opacity-80" />
                <h3 className="text-lg font-semibold mb-2">No Shared Plans Yet</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  Be the first to share your travel plan with the community!
                </p>
                <Button
                  onClick={() => router.push('/dashboard/create-shared-plan')}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg hover:shadow-xl transition-shadow cursor-pointer mx-auto w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
                  onClick={() => router.push(`/shared-plan/${plan.id}`)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2">{plan.name}</CardTitle>
                    <p className="text-sm text-neutral-500">
                      by {plan.sharedBy}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.description && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {plan.description}
                      </p>
                    )}

                    {plan.destinations.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">Destinations:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {plan.destinations.slice(0, 3).map((destination, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex-shrink-0"
                            >
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="text-xs whitespace-nowrap">{destination}</span>
                            </span>
                          ))}
                          {plan.destinations.length > 3 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 flex-shrink-0">
                              <span className="text-xs whitespace-nowrap">+{plan.destinations.length - 3} more</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(plan.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="relative z-[2000]">
        <MobileNav />
      </div>
    </div>
  );
}
