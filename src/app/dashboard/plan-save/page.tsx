"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Save, Trash2, Share, Map } from "lucide-react";
import { UserProfile } from "@/components/dashboard/user-profile";
import { useToast } from "@/hooks/use-toast";
import { LocationRequired } from "@/components/location-required";
import { SavedPlan } from "@/lib/types";
import { Loader } from "@/components/ui/loader";

type PlansUpdater = SavedPlan[] | ((prev: SavedPlan[]) => SavedPlan[]);

export default function PlanSavePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SavedPlan | null>(null);
  const [swipeStates, setSwipeStates] = useState<Record<string, { startX: number; currentX: number; action: 'edit' | 'delete' | null }>>({});
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sharingPlanId, setSharingPlanId] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isAuthenticated = status === "authenticated" && !!session?.user?.email;
  const sortPlans = useCallback((items: SavedPlan[]) => {
    return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);

  const applyPlans = useCallback((items: SavedPlan[]) => {
    setPlans(sortPlans(items));
  }, [sortPlans]);

  const persistLocalPlans = useCallback((updater: PlansUpdater) => {
    setPlans(prev => {
      const next = typeof updater === "function" ? (updater as (prev: SavedPlan[]) => SavedPlan[])(prev) : updater;
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
          ? plan.destinations.map((dest: any) => (typeof dest === "string" ? dest : (dest?.name ?? ""))).filter(Boolean)
          : [],
      }));

      return sortPlans(normalized as SavedPlan[]);
    } catch (error) {
      console.error("Failed to load plans from local storage", error);
      return [];
    }
  }, [sortPlans]);

  const loadPlans = useCallback(async () => {
    if (status === "loading") return;

    setIsLoadingPlans(true);
    setSyncError(null);

    if (isAuthenticated) {
      try {
        const res = await fetch("/api/saved-plans", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to fetch saved plans (${res.status})`);
        }
        const data = await res.json();
        const serverPlans = Array.isArray(data?.plans) ? (data.plans as SavedPlan[]) : [];
        applyPlans(serverPlans);
        if (typeof window !== "undefined") {
          localStorage.removeItem("saved-plans");
        }
      } catch (error) {
        console.error("Failed to fetch plans from server", error);
        const fallback = loadLocalPlans();
        if (fallback.length > 0) {
          setSyncError("Showing locally saved plans because syncing failed.");
          applyPlans(fallback);
        } else {
          setSyncError("Failed to load saved plans. Please try again.");
          setPlans([]);
        }
      } finally {
        setIsLoadingPlans(false);
      }
      return;
    }

    applyPlans(loadLocalPlans());
    setIsLoadingPlans(false);
  }, [applyPlans, isAuthenticated, loadLocalPlans, status]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredPlans = useMemo(() => {
    if (!normalizedQuery) return plans;
    return plans.filter((plan) => {
      const nameMatch = plan.name.toLowerCase().includes(normalizedQuery);
      const descMatch = (plan.description ?? "").toLowerCase().includes(normalizedQuery);
      const destinationsMatch = plan.destinations.some((destination) =>
        String(destination).toLowerCase().includes(normalizedQuery)
      );
      return nameMatch || descMatch || destinationsMatch;
    });
  }, [plans, normalizedQuery]);

  const upsertPlan = useCallback(
    async (plan: SavedPlan, mode: "create" | "update"): Promise<SavedPlan | null> => {
      if (!isAuthenticated) {
        persistLocalPlans(prev => {
          const filtered = prev.filter(p => p.id !== plan.id);
          return [...filtered, plan];
        });
        return plan;
      }

      setIsSaving(true);
      setPendingPlanId(plan.id);
      setSyncError(null);

      try {
        const res = await fetch("/api/saved-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            destinations: plan.destinations,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to save plan (${res.status})`);
        }

        const data = await res.json();
        const saved = (data?.plan as SavedPlan | undefined) ?? null;

        if (saved) {
          setPlans(prev => sortPlans([...prev.filter(p => p.id !== saved.id), saved]));
          return saved;
        }

        return null;
      } catch (error) {
        console.error("Failed to sync plan", error);
        toast({
          title: mode === "create" ? "Failed to create plan" : "Failed to update plan",
          description: "Please try again.",
          variant: "destructive",
        });
        setSyncError("Failed to sync plan. Please try again.");
        return null;
      } finally {
        setIsSaving(false);
        setPendingPlanId(null);
      }
    },
    [isAuthenticated, persistLocalPlans, sortPlans, toast]
  );

  const deletePlan = useCallback(
    async (plan: SavedPlan): Promise<boolean> => {
      if (!isAuthenticated) {
        persistLocalPlans(prev => prev.filter(p => p.id !== plan.id));
        return true;
      }

      setIsSaving(true);
      setPendingPlanId(plan.id);
      setSyncError(null);

      try {
        const res = await fetch(`/api/saved-plans?id=${encodeURIComponent(plan.id)}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error(`Failed to delete plan (${res.status})`);
        }

        setPlans(prev => prev.filter(p => p.id !== plan.id));
        return true;
      } catch (error) {
        console.error("Failed to delete plan", error);
        toast({
          title: "Failed to delete plan",
          description: "Please try again.",
          variant: "destructive",
        });
        setSyncError("Failed to sync plan changes. Please try again.");
        return false;
      } finally {
        setIsSaving(false);
        setPendingPlanId(null);
      }
    },
    [isAuthenticated, persistLocalPlans, toast]
  );

  const handleTouchStart = (e: React.TouchEvent, planId: string) => {
    const touch = e.touches[0];
    setSwipeStates(prev => ({
      ...prev,
      [planId]: { startX: touch.clientX, currentX: touch.clientX, action: null }
    }));
  };

  const handleTouchMove = (e: React.TouchEvent, planId: string) => {
    const touch = e.touches[0];
    const currentSwipeState = swipeStates[planId];

    if (!currentSwipeState) return;

    const deltaX = touch.clientX - currentSwipeState.startX;

    if (Math.abs(deltaX) > 10) { // Minimum swipe distance
      // deltaX > 0 means finger moved RIGHT, deltaX < 0 means finger moved LEFT
      const action = deltaX > 0 ? 'edit' : 'delete'; // Right swipe = edit, Left swipe = delete
      setSwipeStates(prev => ({
        ...prev,
        [planId]: { ...currentSwipeState, currentX: touch.clientX, action }
      }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, planId: string) => {
    const currentSwipeState = swipeStates[planId];

    if (!currentSwipeState || !currentSwipeState.startX) {
      setSwipeStates(prev => ({
        ...prev,
        [planId]: { startX: 0, currentX: 0, action: null }
      }));
      return;
    }

    const deltaX = currentSwipeState.startX - e.changedTouches[0].clientX;
    const absDeltaX = Math.abs(deltaX);

    if (absDeltaX > 80) { // Swipe threshold
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        if (deltaX < 0) {
          // deltaX < 0 means startX < endX, which means RIGHT swipe - edit
          setEditingPlan(plan);
          setPlanName(plan.name);
          setPlanDescription(plan.description);
          // Ensure destinations are strings for editing
          const stringDestinations = Array.isArray(plan.destinations)
            ? plan.destinations.map(dest => String(dest))
            : [];
          setPlanDestinations(stringDestinations.length > 0 ? stringDestinations : []);
        } else {
          // deltaX > 0 means startX > endX, which means LEFT swipe - delete
          if (confirm(`Are you sure you want to delete "${plan.name}"?`)) {
            deletePlan(plan).then((success) => {
              if (success) {
                toast({
                  title: "Plan Deleted",
                  description: `"${plan.name}" has been removed`
                });
              }
            });
          }
        }
      }
    }

    // Reset swipe state with smooth animation
    setSwipeStates(prev => ({
      ...prev,
      [planId]: { startX: 0, currentX: 0, action: null }
    }));
  };

  const getSwipeStyle = (planId: string) => {
    const swipeState = swipeStates[planId];
    if (!swipeState || !swipeState.action) return {};

    const distance = Math.abs(swipeState.currentX - swipeState.startX);
    const opacity = Math.min(distance / 100, 1);

    // Enhanced animations with smooth transitions
    const baseTransform = swipeState.action === 'edit'
      ? `translateX(${Math.min(distance, 60)}px)`  // Right swipe - slide right
      : `translateX(-${Math.min(distance, 60)}px)`; // Left swipe - slide left

    const baseBackgroundColor = swipeState.action === 'edit'
      ? `rgba(34, 197, 94, ${opacity * 0.15})`
      : `rgba(239, 68, 68, ${opacity * 0.15})`;

    return {
      transform: `${baseTransform} scale(${1 + (opacity * 0.02)})`,
      backgroundColor: baseBackgroundColor,
      borderRadius: `${8 + (opacity * 4)}px`,
      boxShadow: swipeState.action === 'edit'
        ? `0 8px 25px rgba(34, 197, 94, ${opacity * 0.3}), 0 0 0 1px rgba(34, 197, 94, ${opacity * 0.2})`
        : `0 8px 25px rgba(239, 68, 68, ${opacity * 0.3}), 0 0 0 1px rgba(239, 68, 68, ${opacity * 0.2})`,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 10
    };
  };

  const getActionIndicator = (planId: string) => {
    const swipeState = swipeStates[planId];
    if (!swipeState || !swipeState.action) return null;

    const distance = Math.abs(swipeState.currentX - swipeState.startX);
    const opacity = Math.min(distance / 50, 1);

    if (swipeState.action === 'edit') {
      return (
        <div
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg animate-pulse"
          style={{
            opacity: opacity * 0.9,
            transform: `translateY(-50%) scale(${0.8 + (opacity * 0.3)})`,
            boxShadow: `0 4px 20px rgba(34, 197, 94, ${opacity * 0.4})`
          }}
        >
          ✏️ Edit
        </div>
      );
    } else if (swipeState.action === 'delete') {
      return (
        <div
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
          style={{
            opacity: opacity * 0.9,
            transform: `translateY(-50%) scale(${0.8 + (opacity * 0.3)})`,
            boxShadow: `0 4px 20px rgba(239, 68, 68, ${opacity * 0.4})`,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        >
          🗑️ Delete
        </div>
      );
    }

    return null;
  };

  // Mouse event handlers for desktop swipe
  const mouseStartXRef = useRef<number>(0);
  const mousePlanIdRef = useRef<string | null>(null);

  const handleMouseDown = (planId: string, e: React.MouseEvent) => {
    mouseStartXRef.current = e.clientX;
    mousePlanIdRef.current = planId;

    // Initialize swipe state for this plan
    setSwipeStates(prev => ({
      ...prev,
      [planId]: { startX: e.clientX, currentX: e.clientX, action: null }
    }));

    const handleMouseMove = (e: MouseEvent) => {
      if (mousePlanIdRef.current) {
        const deltaX = e.clientX - mouseStartXRef.current;

        if (Math.abs(deltaX) > 10) {
          const action = deltaX > 0 ? 'edit' : 'delete';
          setSwipeStates(prev => ({
            ...prev,
            [mousePlanIdRef.current!]: {
              startX: mouseStartXRef.current,
              currentX: e.clientX,
              action
            }
          }));
        }
      }
    };

    const handleMouseUp = () => {
      if (mousePlanIdRef.current) {
        const currentSwipeState = swipeStates[mousePlanIdRef.current];
        if (currentSwipeState && currentSwipeState.action) {
          // Calculate the distance moved
          const deltaX = currentSwipeState.startX - currentSwipeState.currentX;
          const absDeltaX = Math.abs(deltaX);

          if (absDeltaX > 80) {
            const plan = plans.find(p => p.id === mousePlanIdRef.current);
            if (plan) {
              if (currentSwipeState.action === 'edit') {
                setEditingPlan(plan);
                setPlanName(plan.name);
                setPlanDescription(plan.description);
                // Ensure destinations are strings for editing
                const stringDestinations = Array.isArray(plan.destinations)
                  ? plan.destinations.map(dest => String(dest))
                  : [];
                setPlanDestinations(stringDestinations.length > 0 ? stringDestinations : []);
              } else if (currentSwipeState.action === 'delete') {
                if (confirm(`Are you sure you want to delete "${plan.name}"?`)) {
                  deletePlan(plan).then(success => {
                    if (success) {
                      toast({
                        title: "Plan Deleted",
                        description: `"${plan.name}" has been removed`
                      });
                    }
                  });
                }
              }
            }
          }
        }

        setSwipeStates(prev => ({
          ...prev,
          [mousePlanIdRef.current!]: { startX: 0, currentX: 0, action: null }
        }));
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      mouseStartXRef.current = 0;
      mousePlanIdRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // New plan form state - start with empty array and add first destination when needed
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planDestinations, setPlanDestinations] = useState<string[]>([]);

  // Location suggestions state
  const [locationSuggestions, setLocationSuggestions] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);

  const handleCreatePlan = async () => {
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

    const now = Date.now();
    const newPlan: SavedPlan = {
      id: crypto.randomUUID(),
      name: planName.trim(),
      description: planDescription.trim(),
      destinations,
      createdAt: now,
      updatedAt: now
    };

    if (isAuthenticated) {
      const saved = await upsertPlan(newPlan, "create");
      if (!saved) {
        return;
      }
    } else {
      persistLocalPlans(prev => [...prev, newPlan]);
    }

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

  const handleUpdatePlan = async () => {
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

    if (isAuthenticated) {
      const saved = await upsertPlan(updatedPlan, "update");
      if (!saved) {
        return;
      }
    } else {
      persistLocalPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    }

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
      deletePlan(planToDelete).then(success => {
        if (success) {
          toast({
            title: "Plan Deleted",
            description: `"${planToDelete.name}" has been removed`
          });
        }
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
    try {
      // First, create a shared plan in the database
      const shareRes = await fetch("/api/shared-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plan.name,
          description: plan.description || "",
          destinations: plan.destinations,
          sharedBy: session?.user?.name || "Anonymous User"
        }),
      });

      if (!shareRes.ok) {
        throw new Error(`Failed to create shared plan (${shareRes.status})`);
      }

      const shareData = await shareRes.json();
      const sharedPlanId = shareData.plan?.id;

      if (!sharedPlanId) {
        throw new Error("Failed to get shared plan ID");
      }

      const shareUrl = `${window.location.origin}/shared-plan/${sharedPlanId}`;

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
    } catch (error) {
      console.error("Failed to share plan:", error);
      toast({
        title: "Error",
        description: "Failed to share plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewMap = async (plan: SavedPlan) => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get user's current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      if (plan.destinations.length === 0) {
        // If no destinations, just show user location on internal map
        const mapUrl = `/dashboard/map?lat=${userLat}&lon=${userLng}&zoom=15`;
        router.push(mapUrl);
        toast({
          title: "Map Opened",
          description: "Showing your current location"
        });
        return;
      }

      // Get places data to find matching destination IDs
      const placesRes = await fetch('/api/places', { cache: 'no-store' });
      const placesData = await placesRes.json();
      const places = Array.isArray(placesData?.places) ? placesData.places : [];

      // Find matching place IDs for destinations
      const destinationIds: number[] = [];

      for (const destinationName of plan.destinations) {
        // Find place with matching name (case-insensitive)
        const matchingPlace = places.find((place: any) => {
          const placeName = place.tags?.name || place.name || '';
          return placeName.toLowerCase().includes(destinationName.toLowerCase()) ||
                 destinationName.toLowerCase().includes(placeName.toLowerCase());
        });

        if (matchingPlace && matchingPlace.id) {
          destinationIds.push(matchingPlace.id);
        }
      }

      // If we found matching places, use their IDs
      if (destinationIds.length > 0) {
        const planParam = destinationIds.join(',');
        const mapUrl = `/dashboard/map?plan=${planParam}&fromLat=${userLat}&fromLon=${userLng}&mode=plan`;
        router.push(mapUrl);

        toast({
          title: "Map Opened",
          description: `Showing route through ${destinationIds.length} destinations`
        });
      } else {
        // If no matching places found, navigate to map with just user location
        const mapUrl = `/dashboard/map?lat=${userLat}&lon=${userLng}&zoom=15`;
        router.push(mapUrl);

        toast({
          title: "Map Opened",
          description: "Showing your location. Some destinations couldn't be found on map.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error getting location or places:', error);
      toast({
        title: "Error",
        description: "Unable to get your location or load places. Please try again.",
        variant: "destructive"
      });
    }
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

  const copyToClipboard = (url: string, plan: SavedPlan) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copied!",
        description: `Share link for "${plan.name}" copied to clipboard`,
      });
    });
  };

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
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl md:text-2xl font-bold text-transparent drop-shadow-sm">
            Plan Save
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>
      </header>

      <main className="relative flex-1 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
        <div className="mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg xl:max-w-2xl">

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
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-lg font-semibold">My Saved Plans</h2>
                <Button
                  onClick={() => setIsCreating(true)}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Plan
                </Button>
              </div>

              {plans.length > 0 && (
                <div className="mb-4">
                  <Input
                    placeholder="Search plans by name, description, or destination..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              )}

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
              ) : filteredPlans.length === 0 ? (
                <Card className="bg-white dark:bg-neutral-900 border border-dashed border-black/10 dark:border-white/10 shadow-lg">
                  <CardContent className="py-14 text-center">
                    <h3 className="text-lg font-semibold mb-2">No plans match “{searchTerm}”.</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Try adjusting your search to find a specific plan or destination.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredPlans.map((plan) => (
                    <Card
                      key={plan.id}
                      className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
                      style={getSwipeStyle(plan.id)}
                      onTouchStart={(e) => handleTouchStart(e, plan.id)}
                      onTouchMove={(e) => handleTouchMove(e, plan.id)}
                      onTouchEnd={(e) => handleTouchEnd(e, plan.id)}
                      onMouseDown={(e) => handleMouseDown(plan.id, e)}
                    >
                      {getActionIndicator(plan.id)}
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
                                <div className="flex flex-wrap gap-1.5 min-w-0">
                                  {plan.destinations.map((destination, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex-shrink-0"
                                    >
                                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                      <span className="text-xs whitespace-nowrap">{String(destination)}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
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
                          <div className="flex items-center gap-2">
                            <LocationRequired feature="show maps and routes">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewMap(plan)}
                                className="h-6 w-6 p-0 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                title="View on map"
                              >
                                <Map className="h-3 w-3 text-blue-500" />
                              </Button>
                            </LocationRequired>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSharePlan(plan)}
                              className="h-6 w-6 p-0 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20"
                              title="Share plan"
                            >
                              <Share className="h-3 w-3 text-orange-500" />
                            </Button>
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
    </div>
  );
}
