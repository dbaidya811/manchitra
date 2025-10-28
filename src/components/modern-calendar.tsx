"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Save,
  Trash2,
  X,
  Share,
  Map,
  ArrowLeft,
  Calendar,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedPlan, CalendarPlan, PlanDestination } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { LocationRequired } from "@/components/location-required";

interface ModernCalendarProps {
  plans: SavedPlan[];
  isLoading?: boolean;
  deletingPlanId?: string | null;
  onPlanAdd: (plan: CalendarPlan) => void;
  onPlanUpdate: (plan: CalendarPlan) => void;
  onPlanDelete: (planId: string) => void;
}

export function ModernCalendar({ plans, isLoading = false, deletingPlanId = null, onPlanAdd, onPlanUpdate, onPlanDelete }: ModernCalendarProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CalendarPlan | null>(null);

  // List view state
  const [searchTerm, setSearchTerm] = useState("");
  const [swipeStates, setSwipeStates] = useState<Record<string, { startX: number; currentX: number; action: 'edit' | 'delete' | null }>>({});

  // Pandel suggestions state
  const [pandelSuggestions, setPandelSuggestions] = useState<{ id: number; name: string; lat: number; lon: number; area: string }[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Form state
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    destinations: [{ displayName: "", lat: 0, lon: 0 }] as PlanDestination[]
  });

  // Calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()));

  const calendarDays = [];
  let currentDateIterator = new Date(startDate);

  while (currentDateIterator <= endDate) {
    calendarDays.push(new Date(currentDateIterator));
    currentDateIterator.setDate(currentDateIterator.getDate() + 1);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDateKey = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const parseDateKey = useCallback((value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }, []);

  const todayKey = useMemo(() => getDateKey(new Date()), [getDateKey]);

  const isDateInPast = useCallback((value: Date | string) => {
    const candidate = typeof value === "string" ? parseDateKey(value) : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    if (Number.isNaN(candidate.getTime())) {
      return false;
    }
    candidate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return candidate < today;
  }, [parseDateKey]);

  // Convert SavedPlan to CalendarPlan for calendar display
  const convertToCalendarPlan = (plan: SavedPlan, date: string): CalendarPlan => {
    return {
      id: plan.id,
      date,
      title: plan.name,
      description: plan.description,
      destinations: plan.destinations.map(dest => ({
        displayName: dest.displayName || "",
        lat: dest.lat,
        lon: dest.lon,
        area: dest.area
      })),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };
  };

  // Get plans for a specific date
  const getPlansForDate = (date: Date): CalendarPlan[] => {
    const dateKey = getDateKey(date);
    return plans
      .filter(plan => {
        const rawDate = (plan as any).date;
        const planDateKey = typeof rawDate === "string" && rawDate ? rawDate : getDateKey(new Date(plan.createdAt));
        return planDateKey === dateKey;
      })
      .map(plan => convertToCalendarPlan(plan, dateKey));
  };

  // Search functionality
  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredPlans = useMemo(() => {
    if (!normalizedQuery) return plans;
    return plans.filter((plan) => {
      const nameMatch = plan.name.toLowerCase().includes(normalizedQuery);
      const descMatch = (plan.description ?? "").toLowerCase().includes(normalizedQuery);
      const destinationsMatch = plan.destinations.some((destination) =>
        destination.displayName.toLowerCase().includes(normalizedQuery)
      );
      const dateMatch = (plan as any).date ? new Date((plan as any).date).toLocaleDateString().toLowerCase().includes(normalizedQuery) : false;
      return nameMatch || descMatch || destinationsMatch || dateMatch;
    });
  }, [plans, normalizedQuery]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, planId: string) => {
    if (isLoading || deletingPlanId === planId) return;
    const touch = e.touches[0];
    setSwipeStates(prev => ({
      ...prev,
      [planId]: { startX: touch.clientX, currentX: touch.clientX, action: null }
    }));
  };

  const handleTouchMove = (e: React.TouchEvent, planId: string) => {
    if (isLoading || deletingPlanId === planId) return;
    const touch = e.touches[0];
    const currentSwipeState = swipeStates[planId];

    if (!currentSwipeState) return;

    const deltaX = touch.clientX - currentSwipeState.startX;

    if (Math.abs(deltaX) > 10) {
      // deltaX > 0 means swiping left (edit), deltaX < 0 means swiping right (delete)
      const action = deltaX < 0 ? 'delete' : 'edit';
      setSwipeStates(prev => ({
        ...prev,
        [planId]: { ...currentSwipeState, currentX: touch.clientX, action }
      }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, planId: string) => {
    if (isLoading || deletingPlanId === planId) return;
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

    if (absDeltaX > 50) {
      const plan = filteredPlans.find(p => p.id === planId);
      if (plan) {
        if (deltaX < 0) {
          // Right swipe - delete
          onPlanDelete(planId);
        } else {
          // Left swipe - edit
          handleEditPlanFromList(plan);
        }
      }
    }

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

    const baseTransform = swipeState.action === 'edit'
      ? `translateX(-${Math.min(distance, 60)}px)` // Edit: move left
      : `translateX(${Math.min(distance, 60)}px)`; // Delete: move right

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
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg animate-pulse"
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
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
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

  // Calendar handlers
  const handleDateClick = (date: Date) => {
    const dateKey = getDateKey(date);
    setSelectedDate(dateKey);

    if (isDateInPast(date)) {
      toast({
        title: "Past Date",
        description: "You can only create plans for today or future dates.",
        variant: "destructive",
      });
      return;
    }

    const datePlans = getPlansForDate(date);
    if (datePlans.length === 0) {
      resetForm();
      setIsAddPlanOpen(true);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Form handlers
  const resetForm = () => {
    setPlanForm({
      title: "",
      description: "",
      destinations: [{ displayName: "", lat: 0, lon: 0 }]
    });
    setEditingPlan(null);
  };

  const handleAddPlan = () => {
    if (!selectedDate || !planForm.title.trim()) return;

    if (isDateInPast(selectedDate)) {
      toast({
        title: "Invalid Date",
        description: "Please choose today or a future date for new plans.",
        variant: "destructive",
      });
      return;
    }

    const cleanDestinations = planForm.destinations
      .map(dest => ({
        displayName: dest.displayName.trim(),
        lat: dest.lat,
        lon: dest.lon,
        area: dest.area,
      }))
      .filter(dest => dest.displayName && dest.lat !== 0 && dest.lon !== 0);

    if (cleanDestinations.length === 0) {
      toast({
        title: "Add a destination",
        description: "Include at least one pandel with valid coordinates before saving the plan.",
        variant: "destructive",
      });
      return;
    }

    const newPlan: CalendarPlan = {
      id: crypto.randomUUID(),
      date: selectedDate,
      title: planForm.title.trim(),
      description: planForm.description.trim(),
      destinations: cleanDestinations,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    onPlanAdd(newPlan);
    resetForm();
    setIsAddPlanOpen(false);
  };

  const handleEditPlan = (plan: CalendarPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      title: plan.title,
      description: plan.description || "",
      destinations: plan.destinations.length > 0 ? plan.destinations : [{ displayName: "", lat: 0, lon: 0 }]
    });
    setIsAddPlanOpen(true);
  };

  const handleEditPlanFromList = (plan: SavedPlan) => {
    const planDate = (plan as any).date && typeof (plan as any).date === "string"
      ? (plan as any).date
      : getDateKey(new Date(plan.createdAt));
    const calendarPlan = convertToCalendarPlan(plan, planDate);
    setSelectedDate(planDate); // Set the selected date for the plan
    handleEditPlan(calendarPlan);
  };

  const handleUpdatePlan = () => {
    if (!editingPlan || !planForm.title.trim()) return;

    const cleanDestinations = planForm.destinations
      .map(dest => ({
        displayName: dest.displayName.trim(),
        lat: dest.lat,
        lon: dest.lon,
        area: dest.area,
      }))
      .filter(dest => dest.displayName && dest.lat !== 0 && dest.lon !== 0);

    if (cleanDestinations.length === 0) {
      toast({
        title: "Add a destination",
        description: "Include at least one pandel with valid coordinates before saving the plan.",
        variant: "destructive",
      });
      return;
    }

    const updatedPlan: CalendarPlan = {
      ...editingPlan,
      title: planForm.title.trim(),
      description: planForm.description.trim(),
      destinations: cleanDestinations,
      updatedAt: Date.now()
    };

    onPlanUpdate(updatedPlan);
    resetForm();
    setIsAddPlanOpen(false);
  };

  const handleSharePlan = async (plan: SavedPlan) => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (data.ok) {
        const shareUrl = data.shareUrl;
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Plan Shared!",
          description: "Share link copied to clipboard.",
        });
      } else {
        throw new Error(data.error || "Failed to share plan");
      }
    } catch (error) {
      console.error("Failed to share plan:", error);
      toast({
        title: "Share Failed",
        description: "Failed to share plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = (planId: string) => {
    onPlanDelete(planId);
  };

  const handleNavigatePlan = (plan: SavedPlan) => {
    try {
      const destinations = (plan.destinations || [])
        .map(dest => ({
          name: dest.displayName || "",
          lat: dest.lat,
          lon: dest.lon,
          area: dest.area,
        }))
        .filter(dest => dest.name && dest.lat !== 0 && dest.lon !== 0);

      if (destinations.length === 0) {
        toast({
          title: "No destinations",
          description: "Add at least one destination with coordinates to navigate this plan.",
          variant: "destructive",
        });
        return;
      }

      const params = new URLSearchParams();
      params.set("mode", "plan");
      params.set("planName", plan.name ?? "Plan");
      params.set("destinations", JSON.stringify(destinations));

      if ((plan as any).date) {
        params.set("planDate", new Date((plan as any).date).toISOString());
      }

      router.push(`/dashboard/map?${params.toString()}`);
    } catch (error) {
      console.error("Failed to navigate plan:", error);
      toast({
        title: "Navigation failed",
        description: "We couldn't open the map for this plan.",
        variant: "destructive",
      });
    }
  };

  // Form field handlers
  const addDestination = () => {
    setPlanForm(prev => ({
      ...prev,
      destinations: [...prev.destinations, { displayName: "", lat: 0, lon: 0 }]
    }));
  };

  const updateDestination = (index: number, value: string) => {
    setPlanForm(prev => ({
      ...prev,
      destinations: prev.destinations.map((dest, i) =>
        i === index ? { displayName: value, lat: dest.lat, lon: dest.lon, area: dest.area } : dest
      )
    }));

    setSelectedSuggestionIndex(-1);

    if (value.trim().length >= 2) {
      fetchPandelSuggestions(value.trim(), index);
    } else {
      setPandelSuggestions([]);
      setActiveSuggestionField(null);
    }
  };

  const fetchPandelSuggestions = async (query: string, fieldIndex: number) => {
    if (query.length < 2) {
      setPandelSuggestions([]);
      setActiveSuggestionField(null);
      setSelectedSuggestionIndex(-1);
      return;
    }

    setIsLoadingSuggestions(true);
    setActiveSuggestionField(`${fieldIndex}`);
    setSelectedSuggestionIndex(-1);

    try {
      const res = await fetch(`/api/pandel-suggestions?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();

      if (data.ok && data.suggestions) {
        setPandelSuggestions(data.suggestions);
      } else {
        setPandelSuggestions([]);
      }
    } catch (error) {
      console.error('Failed to fetch pandel suggestions:', error);
      setPandelSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const selectPandelSuggestion = (fieldIndex: number, suggestion: { id: number; name: string; lat: number; lon: number; area: string }) => {
    setPlanForm(prev => ({
      ...prev,
      destinations: prev.destinations.map((dest, i) =>
        i === fieldIndex
          ? { displayName: suggestion.name, lat: suggestion.lat, lon: suggestion.lon, area: suggestion.area }
          : dest
      )
    }));
    setPandelSuggestions([]);
    setActiveSuggestionField(null);
    setSelectedSuggestionIndex(-1);
  };

  const closeSuggestions = () => {
    setPandelSuggestions([]);
    setActiveSuggestionField(null);
    setSelectedSuggestionIndex(-1);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeSuggestionField && !(event.target as Element).closest('.suggestion-container')) {
        closeSuggestions();
      }
    };

    if (activeSuggestionField) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeSuggestionField]);

  const removeDestination = (index: number) => {
    if (planForm.destinations.length > 1) {
      setPlanForm(prev => ({
        ...prev,
        destinations: prev.destinations.filter((_, i) => i !== index)
      }));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {monthNames[month]} {year}
        </h2>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const dateKey = getDateKey(date);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = dateKey === todayKey;
            const dayPlans = getPlansForDate(date);

            return (
              <div
                key={index}
                className={cn(
                  "relative min-h-[80px] p-2 border rounded-lg cursor-pointer transition-colors",
                  "hover:bg-gray-50 dark:hover:bg-gray-700",
                  isCurrentMonth
                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600",
                  isToday && "ring-2 ring-blue-500",
                  selectedDate === dateKey && "ring-2 ring-orange-500"
                )}
                onClick={() => handleDateClick(date)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isToday && "text-blue-600 dark:text-blue-400",
                    selectedDate === dateKey && "text-orange-600 dark:text-orange-400"
                  )}>
                    {date.getDate()}
                  </span>
                  {dayPlans.length > 0 && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-1 rounded">
                      {dayPlans.length}
                    </span>
                  )}
                </div>

                {/* Plans for this day */}
                <div className="space-y-1">
                  {dayPlans.slice(0, 2).map((plan) => (
                    <div
                      key={plan.id}
                      className="text-xs p-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded truncate"
                      title={plan.title}
                    >
                      {plan.title}
                    </div>
                  ))}
                  {dayPlans.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayPlans.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Plan Dialog */}
      <Dialog open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Add New Plan"}
              {selectedDate && (
                <span className="block text-sm font-normal text-gray-500">
                  {new Date(selectedDate).toLocaleDateString()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Plan Title</label>
              <Input
                value={planForm.title}
                onChange={(e) => setPlanForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter plan title..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={planForm.description}
                onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter plan description..."
                rows={3}
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
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {planForm.destinations.map((destination, index) => (
                  <div key={index} className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={destination?.displayName ?? ""}
                          onChange={(e) => updateDestination(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (pandelSuggestions.length > 0 && activeSuggestionField === `${index}`) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedSuggestionIndex(prev =>
                                  prev < pandelSuggestions.length - 1 ? prev + 1 : prev
                                );
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : prev);
                              } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                                e.preventDefault();
                                selectPandelSuggestion(index, pandelSuggestions[selectedSuggestionIndex]);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                closeSuggestions();
                              }
                            }
                          }}
                          placeholder={`Destination ${index + 1}`}
                        />
                        {/* Individual Pandel Suggestions for this field */}
                        {isLoadingSuggestions && activeSuggestionField === `${index}` && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg suggestion-container">
                            <div className="px-3 py-2 text-sm text-gray-500">
                              Loading suggestions...
                            </div>
                          </div>
                        )}
                        {pandelSuggestions.length > 0 && activeSuggestionField === `${index}` && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto suggestion-container">
                            {pandelSuggestions.map((suggestion, suggestionIdx) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                className={`w-full px-3 py-2 text-left focus:outline-none transition-colors ${
                                  suggestionIdx === selectedSuggestionIndex
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                onClick={() => selectPandelSuggestion(index, suggestion)}
                                onMouseEnter={() => setSelectedSuggestionIndex(suggestionIdx)}
                              >
                                <div className="font-medium">{suggestion.name}</div>
                                {suggestion.area && (
                                  <div className="text-sm text-gray-500">{suggestion.area}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {planForm.destinations.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeDestination(index)}
                          className="h-10 w-10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Remove the old suggestions section since we now have individual ones */}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddPlanOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingPlan ? handleUpdatePlan : handleAddPlan}
              disabled={!planForm.title.trim()}
            >
              {editingPlan ? "Update" : "Add"} Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plans List View */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">All Plans</h3>
          <div className="flex-1">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search plans..."
              className="max-w-xs"
            />
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto" style={{ touchAction: 'none' }}>
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className="relative"
              style={{
                ...getSwipeStyle(plan.id),
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleTouchStart(e, plan.id);
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleTouchMove(e, plan.id);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handleTouchEnd(e, plan.id);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <h4 className="font-medium">{plan.name}</h4>
                    {plan.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {plan.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {((plan as any).date)
                          ? new Date((plan as any).date).toLocaleDateString()
                          : new Date(plan.createdAt).toLocaleDateString()
                        }
                      </span>
                      {plan.destinations.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {plan.destinations.length} destinations
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 flex items-center gap-2"
                      onClick={() => handleNavigatePlan(plan)}
                    >
                      <Map className="h-3.5 w-3.5" />
                      Navigate
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isLoading || deletingPlanId === plan.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleEditPlanFromList(plan);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleSharePlan(plan);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Share className="h-4 w-4" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDeletePlan(plan.id);
                          }}
                          className="flex items-center gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
              {getActionIndicator(plan.id)}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
