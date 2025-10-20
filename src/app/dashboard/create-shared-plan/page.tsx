"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Plus, X, Share2, Save } from "lucide-react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useToast } from "@/hooks/use-toast";

export default function CreateSharedPlanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  const addDestination = () => {
    setDestinations([...destinations, ""]);
  };

  const removeDestination = (index: number) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter((_, i) => i !== index));
    }
  };

  const updateDestination = (index: number, value: string) => {
    const updated = [...destinations];
    updated[index] = value;
    setDestinations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!planName.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const validDestinations = destinations.filter(dest => dest.trim() !== "");
    if (validDestinations.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one destination",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/shared-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: planName.trim(),
          description: description.trim(),
          destinations: validDestinations,
          sharedBy: session?.user?.name || session?.user?.email || 'Anonymous User'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Plan Created!",
          description: `"${planName}" has been shared successfully`,
        });

        // Redirect to the shared plan page
        router.push(`/shared-plan/${data.plan.id}`);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create shared plan",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating shared plan:', error);
      toast({
        title: "Error",
        description: "Failed to create shared plan",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = planName.trim() && description.trim() && destinations.some(dest => dest.trim());

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
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl md:text-3xl font-extrabold text-transparent drop-shadow-md tracking-tight">
            Create Shared Plan
          </h1>
        </div>
      </header>

      <main className="relative flex-1 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
        <div className="mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg">
          <Card className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-orange-500" />
                Share Your Travel Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="planName" className="text-sm font-medium">
                    Plan Name *
                  </label>
                  <Input
                    id="planName"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g., Summer Trip to Europe"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description *
                  </label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your travel plan..."
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Destinations</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDestination}
                      className="rounded-lg"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Destination
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {destinations.map((destination, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                          <Input
                            value={destination}
                            onChange={(e) => updateDestination(index, e.target.value)}
                            placeholder={`Destination ${index + 1}`}
                            className="pl-10 rounded-xl"
                          />
                        </div>
                        {destinations.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeDestination(index)}
                            className="rounded-xl"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Preview of destination cards */}
                  {destinations.filter(dest => dest.trim()).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-600">Preview:</label>
                      <div className="flex flex-wrap gap-1.5 min-w-0">
                        {destinations.filter(dest => dest.trim()).slice(0, 4).map((destination, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex-shrink-0"
                          >
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="text-xs font-medium whitespace-nowrap">{destination}</span>
                          </div>
                        ))}
                        {destinations.filter(dest => dest.trim()).length > 4 && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                            <span className="text-xs font-medium">+{destinations.filter(dest => dest.trim()).length - 4} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={!canSubmit || saving}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Creating Plan..." : "Create & Share Plan"}
                  </Button>
                </div>
              </form>
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
