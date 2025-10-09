"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Save, Trash2, Share2 } from "lucide-react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserProfile } from "@/components/dashboard/user-profile";
import { useToast } from "@/hooks/use-toast";

interface SavedPlan {
  id: string;
  name: string;
  description: string;
  destinations: string[];
  createdAt: number;
  updatedAt: number;
}

export default function PlanSavePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SavedPlan | null>(null);

  // New plan form state - start with empty array and add first destination when needed
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planDestinations, setPlanDestinations] = useState<string[]>([]);

  // Location suggestions state
  const [locationSuggestions, setLocationSuggestions] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window !== 'undefined') {
      loadPlans();
    }
  }, []);

  const loadPlans = () => {
    try {
      if (typeof window === 'undefined') return;

      const saved = localStorage.getItem("saved-plans");
      if (saved) {
        const plansData = JSON.parse(saved);
        // Ensure plansData is an array and handle old format compatibility
        if (Array.isArray(plansData)) {
          const convertedPlans = plansData.map((plan: any) => ({
            ...plan,
            destinations: Array.isArray(plan.destinations)
              ? plan.destinations.map((dest: any) =>
                  typeof dest === 'string' ? dest : (dest?.name || dest)
                )
              : []
          }));
          setPlans(convertedPlans);
        } else {
          setPlans([]);
        }
      }
    } catch (error) {
      console.error("Failed to load plans:", error);
      setPlans([]); // Reset to empty array on error
    }
  };

  const savePlans = (plansToSave: SavedPlan[]) => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.setItem("saved-plans", JSON.stringify(plansToSave));
      setPlans(plansToSave);
    } catch (error) {
      console.error("Failed to save plans:", error);
      toast({
        title: "Error",
        description: "Failed to save plans. Storage may be full.",
        variant: "destructive"
      });
    }
  };

  const handleCreatePlan = () => {
    if (!planName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a plan name",
        variant: "destructive"
      });
      return;
    }

    const destinations = planDestinations.filter(dest => dest && dest.trim().length > 0);

    if (destinations.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one destination",
        variant: "destructive"
      });
      return;
    }

    const newPlan: SavedPlan = {
      id: crypto.randomUUID(),
      name: planName.trim(),
      description: planDescription.trim(),
      destinations,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedPlans = [...plans, newPlan];
    savePlans(updatedPlans);

    // Reset form
    setPlanName("");
    setPlanDescription("");
    setPlanDestinations([]);

    setIsCreating(false);

    toast({
      title: "Plan Created",
      description: `"${newPlan.name}" has been saved successfully!`
    });
  };

  const handleEditPlan = (plan: SavedPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanDescription(plan.description);
    // Ensure destinations are strings for editing
    const stringDestinations = Array.isArray(plan.destinations)
      ? plan.destinations.map(dest => String(dest))
      : [];
    setPlanDestinations(stringDestinations.length > 0 ? stringDestinations : []);
  };

  const handleUpdatePlan = () => {
    if (!editingPlan || !planName.trim()) return;

    const destinations = planDestinations.filter(dest => dest && dest.trim().length > 0);

    if (destinations.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one destination",
        variant: "destructive"
      });
      return;
    }

    const updatedPlan: SavedPlan = {
      ...editingPlan,
      name: planName.trim(),
      description: planDescription.trim(),
      destinations,
      updatedAt: Date.now()
    };

    const updatedPlans = plans.map(p => p.id === editingPlan.id ? updatedPlan : p);
    savePlans(updatedPlans);

    // Reset form
    setEditingPlan(null);
    setPlanName("");
    setPlanDescription("");
    setPlanDestinations([]);

    toast({
      title: "Plan Updated",
      description: `"${updatedPlan.name}" has been updated successfully!`
    });
  };

  const handleDeletePlan = (planId: string) => {
    const planToDelete = plans.find(p => p.id === planId);
    if (!planToDelete) return;

    if (confirm(`Are you sure you want to delete "${planToDelete.name}"?`)) {
      const updatedPlans = plans.filter(p => p.id !== planId);
      savePlans(updatedPlans);

      toast({
        title: "Plan Deleted",
        description: `"${planToDelete.name}" has been removed`
      });
    }
  };

  const addDestination = () => {
    // Allow adding first destination if array is empty
    if (planDestinations.length === 0) {
      setPlanDestinations([""]);
      return;
    }

    // Check if the last destination is filled before adding a new one
    const lastDestination = planDestinations[planDestinations.length - 1];
    if (lastDestination && lastDestination.trim().length > 0) {
      setPlanDestinations([...planDestinations, ""]);
    } else {
      toast({
        title: "Info",
        description: "Please fill the current destination first",
        variant: "default"
      });
    }
  };

  const updateDestination = (index: number, value: string) => {
    const updated = [...planDestinations];
    updated[index] = value;
    setPlanDestinations(updated);

    // Fetch suggestions for this destination if there's a value
    if (value.trim().length >= 2) {
      fetchLocationSuggestions(value.trim());
      setShowSuggestions(`${index}`);
    } else {
      setShowSuggestions(null);
    }
  };

  const selectLocationSuggestion = (index: number, location: { name: string; lat: number; lon: number }) => {
    const updated = [...planDestinations];
    updated[index] = location.name; // Only save the name for now
    setPlanDestinations(updated);
    setShowSuggestions(null);
    setLocationSuggestions([]);
  };

  const fetchLocationSuggestions = async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    setIsLoadingLocations(true);
    try {
      const res = await fetch('/api/places');
      const data = await res.json();

      if (data?.places && Array.isArray(data.places)) {
        const suggestions = data.places
          .filter((place: any) =>
            place?.tags?.name &&
            place.tags.name.toLowerCase().includes(query.toLowerCase())
          )
          .map((place: any) => ({
            name: place.tags.name,
            lat: place.lat,
            lon: place.lon
          }))
          .slice(0, 5); // Limit to 5 suggestions

        setLocationSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch location suggestions:', error);
      setLocationSuggestions([]);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const removeDestination = (index: number) => {
    if (planDestinations.length > 1) {
      const updated = planDestinations.filter((_, i) => i !== index);
      setPlanDestinations(updated);
    } else {
      toast({
        title: "Info",
        description: "At least one destination is required",
        variant: "default"
      });
    }
  };

  const handleSharePlan = async (plan: SavedPlan) => {
    const shareUrl = `${window.location.origin}/shared-plan/${plan.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: plan.name,
          text: `Check out this travel plan: ${plan.name}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
        copyToClipboard(shareUrl, plan);
      }
    } else {
      copyToClipboard(shareUrl, plan);
    }
  };

  const copyToClipboard = (url: string, plan: SavedPlan) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copied!",
        description: `Share link for "${plan.name}" copied to clipboard`,
      });
    });
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
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl md:text-2xl font-bold text-transparent drop-shadow-sm">
            Plan Save
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>
      </header>

      <main className="relative flex-1 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
        <div className="mx-auto w-full max-w-2xl space-y-6">

          {/* Create/Edit Plan Form */}
          {(isCreating || editingPlan) && (
            <Card className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-orange-500" />
                  {editingPlan ? "Edit Plan" : "Create New Plan"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Plan Name *</label>
                  <Input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Enter plan name..."
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Describe your plan..."
                    className="rounded-xl min-h-[100px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Destinations</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDestination}
                      className="rounded-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {planDestinations.map((destination, index) => (
                      <div key={index} className="relative">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              value={destination}
                              onChange={(e) => updateDestination(index, e.target.value)}
                              placeholder={`Destination ${index + 1}`}
                              className="rounded-xl"
                            />

                            {/* Location Suggestions Dropdown */}
                            {showSuggestions === `${index}` && locationSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-lg max-h-48 overflow-auto">
                                {locationSuggestions.map((suggestion, suggestionIndex) => (
                                  <button
                                    key={suggestionIndex}
                                    onClick={() => selectLocationSuggestion(index, suggestion)}
                                    className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-b border-black/5 dark:border-white/5 last:border-b-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-orange-500" />
                                      <div>
                                        <div className="text-sm font-medium">{suggestion.name}</div>
                                        <div className="text-xs text-neutral-500">
                                          {suggestion.lat.toFixed(3)}, {suggestion.lon.toFixed(3)}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeDestination(index)}
                            className="rounded-xl h-10 w-10 shrink-0 hover:bg-red-50 hover:border-red-200"
                            title="Remove destination"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
                    className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    {editingPlan ? "Update Plan" : "Create Plan"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingPlan(null);
                      setPlanName("");
                      setPlanDescription("");
                      setPlanDestinations([]);
                    }}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plans List */}
          {!isCreating && !editingPlan && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">My Saved Plans</h2>
                <Button
                  onClick={() => setIsCreating(true)}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Plan
                </Button>
              </div>

              {plans.length === 0 ? (
                <Card className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg">
                  <CardContent className="py-16 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 opacity-80" />
                    <h3 className="text-lg font-semibold mb-2">No plans yet</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                      Create your first travel plan to get started
                    </p>
                    <Button
                      onClick={() => setIsCreating(true)}
                      className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {plans.map((plan) => (
                    <Card key={plan.id} className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                            {plan.description && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                                {plan.description}
                              </p>
                            )}

                            {plan.destinations.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-neutral-500">
                                  <MapPin className="h-4 w-4" />
                                  <span className="font-medium">Destinations:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {plan.destinations.map((destination, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    >
                                      <MapPin className="h-3 w-3" />
                                      {String(destination)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSharePlan(plan)}
                              className="rounded-xl"
                              title="Share plan"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlan(plan)}
                              className="rounded-xl"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <div className="relative z-[2000]">
        <MobileNav />
      </div>
    </div>
  );
}
