"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, MapPin, User, Plus, Share2 } from "lucide-react";
import { SavedPlan } from "@/lib/types";

interface SharePageClientProps {
  shareId: string;
  initialPlan: SavedPlan;
  originalUserEmail: string;
}

export function SharePageClient({ shareId, initialPlan, originalUserEmail }: SharePageClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToMyPlans = async () => {
    if (status !== "authenticated") {
      toast({
        title: "Login Required",
        description: "Please log in to add this plan to your saved plans.",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch(`/api/share/${shareId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_to_my_plans" }),
      });

      const data = await res.json();

      if (data.ok) {
        toast({
          title: "Plan Added!",
          description: `"${data.plan.name}" has been added to your saved plans.`,
        });
        router.push("/dashboard/plan-save");
      } else {
        throw new Error(data.error || "Failed to add plan");
      }
    } catch (error) {
      console.error("Failed to add plan:", error);
      toast({
        title: "Error",
        description: "Failed to add plan to your saved plans. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const shareUrl = `${window.location.origin}/share/${shareId}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Share link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Share2 className="h-12 w-12 text-orange-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Shared Plan
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Someone shared this plan with you
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{initialPlan.name}</CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Shared Plan
              </Badge>
            </div>
            {initialPlan.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {initialPlan.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarIcon className="h-4 w-4" />
              Created: {new Date(initialPlan.createdAt).toLocaleDateString()}
            </div>

            {initialPlan.destinations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4" />
                  Destinations ({initialPlan.destinations.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {initialPlan.destinations.map((destination, index) => (
                    <Badge key={index} variant="outline">
                      {destination}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <User className="h-3 w-3" />
                Shared by: {originalUserEmail}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {status === "authenticated" ? (
                  <Button
                    onClick={handleAddToMyPlans}
                    disabled={isAdding}
                    className="flex-1"
                  >
                    {isAdding ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add to My Plans
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="flex-1"
                  >
                    Login to Add Plan
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={copyShareLink}
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500 mb-4">
            This link will expire in 7 days
          </p>
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="text-gray-600 hover:text-gray-900"
          >
            Go to ManChitra Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
