"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, X, Heart, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface Story {
  id: string;
  userEmail: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  createdAt: number;
  likes?: string[]; // Array of user emails who liked
  views?: string[]; // Array of user emails who viewed
}

interface FeedUser {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

interface StoryCarouselProps {
  feedUsers?: FeedUser[];
}

export function StoryCarousel({ feedUsers = [] }: StoryCarouselProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);

  // Load stories from API
  const loadStories = async () => {
    try {
      console.log("🔄 Fetching stories from API...");
      const response = await fetch("/api/stories");
      console.log("📡 API Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📖 Loaded stories from API:", data.stories.length);
        console.log("Stories data:", data.stories);
        console.log("Current user:", session?.user?.email);
        setStories(data.stories || []);
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to load stories:", response.status, errorData);
      }
    } catch (err) {
      console.error("❌ Error loading stories:", err);
    }
  };

  useEffect(() => {
    loadStories();
    // Poll for new stories every 10 seconds (reduced for better performance)
    const interval = setInterval(loadStories, 10000);
    return () => clearInterval(interval);
  }, []);

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userEmail]) {
      acc[story.userEmail] = [];
    }
    acc[story.userEmail].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageUrl = reader.result as string;
        
        try {
          const response = await fetch("/api/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl })
          });

          if (response.ok) {
            const data = await response.json();
            console.log("📤 Story uploaded:", data.story.userName);
            
            // Reload stories to show the new one
            await loadStories();
            
            setShowUploadDialog(false);
            
            toast({
              title: "Story uploaded!",
              description: "Your story is now visible to all users"
            });
          } else {
            throw new Error("Upload failed");
          }
        } catch (error) {
          toast({
            title: "Upload failed",
            description: "Could not upload story",
            variant: "destructive"
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload story",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const currentUserEmail = session?.user?.email;
  const hasCurrentUserStory = currentUserEmail && groupedStories[currentUserEmail];

  // Handle view tracking
  const handleView = async (story: Story) => {
    if (!currentUserEmail) return;
    
    // Track view in background without blocking UI
    fetch(`/api/stories/${story.id}/view`, {
      method: "POST"
    }).catch(error => {
      console.error("Error tracking view:", error);
    });
  };

  // Handle like toggle
  const handleLike = async (story: Story) => {
    if (!currentUserEmail) return;
    
    // Check current like status
    const likes = story.likes || [];
    const isCurrentlyLiked = likes.includes(currentUserEmail);
    const willBeLiked = !isCurrentlyLiked;
    
    // INSTANT UPDATE - Update UI immediately before API call
    const updatedStories = stories.map(s => {
      if (s.id === story.id) {
        return {
          ...s,
          likes: willBeLiked 
            ? [...likes, currentUserEmail]
            : likes.filter(email => email !== currentUserEmail)
        };
      }
      return s;
    });
    
    setStories(updatedStories);
    
    // Update selected story immediately
    if (selectedStory?.id === story.id) {
      const updatedStory = updatedStories.find(s => s.id === story.id);
      if (updatedStory) {
        setSelectedStory(updatedStory);
      }
    }
    
    // Show animation only when liking
    if (willBeLiked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
    
    // Then make API call in background
    try {
      const response = await fetch(`/api/stories/${story.id}/like`, {
        method: "POST"
      });
      
      if (!response.ok) {
        // If API fails, revert the optimistic update
        setStories(stories);
        if (selectedStory?.id === story.id) {
          setSelectedStory(story);
        }
        throw new Error("Like failed");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Like failed",
        description: "Could not update like",
        variant: "destructive"
      });
    }
  };

  // Handle delete story
  const handleDelete = async (story: Story) => {
    if (!currentUserEmail || story.userEmail !== currentUserEmail) return;
    
    if (!confirm("Are you sure you want to delete this story?")) return;
    
    // INSTANT UPDATE - Remove from UI immediately
    const updatedStories = stories.filter(s => s.id !== story.id);
    setStories(updatedStories);
    setSelectedStory(null);
    
    toast({
      title: "Story deleted",
      description: "Your story has been removed"
    });
    
    // Delete from server in background
    try {
      const response = await fetch(`/api/stories/${story.id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        // If API fails, restore the story
        setStories(stories);
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      toast({
        title: "Delete failed",
        description: "Could not delete story from server",
        variant: "destructive"
      });
      // Restore story on failure
      setStories(stories);
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 px-4 -mx-4 snap-x snap-mandatory scrollbar-hide">
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-2 shrink-0 snap-start">
          <button
            onClick={() => setShowUploadDialog(true)}
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 hover:scale-105 transition-transform"
          >
            <div className="w-full h-full rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center">
              <Plus className="h-6 w-6 text-purple-600" />
            </div>
          </button>
          <span className="text-xs text-center max-w-[70px] truncate">Your Story</span>
        </div>

        {/* User Stories */}
        {Object.entries(groupedStories).map(([email, userStories]) => {
          const latestStory = userStories[0];
          const isCurrentUser = email === currentUserEmail;
          
          return (
            <div key={email} className="flex flex-col items-center gap-2 shrink-0 snap-start">
              <button
                onClick={() => {
                  handleView(latestStory);
                  setSelectedStory(latestStory);
                }}
                className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-0.5 hover:scale-105 transition-transform"
              >
                <Avatar className="w-full h-full border-2 border-white dark:border-neutral-900">
                  <AvatarImage src={latestStory.userAvatar} />
                  <AvatarFallback>{latestStory.userName.charAt(0)}</AvatarFallback>
                </Avatar>
              </button>
              <span className="text-xs text-center max-w-[70px] truncate">
                {isCurrentUser ? "You" : latestStory.userName}
              </span>
            </div>
          );
        })}

        {/* Online Users Without Stories */}
        {feedUsers.map((user, index) => {
          const userEmail = user.email || '';
          const userName = user.name || 'User';
          const userAvatar = (user.image as string) || '';
          
          // Skip if user already has a story
          if (groupedStories[userEmail]) return null;
          
          return (
            <div key={userEmail || index} className="flex flex-col items-center gap-2 shrink-0 snap-start">
              <div className="relative w-16 h-16">
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-rose-500 text-white">
                    {userName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 right-0 flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              </div>
              <span className="text-xs text-center max-w-[70px] truncate">{userName}</span>
            </div>
          );
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Add to Story</h2>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="story-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="story-upload"
              className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {isUploading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Plus className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload image</p>
                </div>
              )}
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      {selectedStory && (
        <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
          <DialogContent className="max-w-md p-0 bg-black border-0">
            <div className="relative h-[80vh]">
              {/* Top Right Buttons */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                {/* Delete Button - Only for story owner */}
                {selectedStory.userEmail === currentUserEmail && (
                  <button
                    onClick={() => handleDelete(selectedStory)}
                    className="h-8 w-8 rounded-full bg-red-500/80 backdrop-blur flex items-center justify-center text-white hover:bg-red-600 transition"
                    title="Delete story"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {/* Close Button */}
                <button
                  onClick={() => setSelectedStory(null)}
                  className="h-8 w-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 pr-14 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10 border-2 border-white">
                    <AvatarImage src={selectedStory.userAvatar} />
                    <AvatarFallback>{selectedStory.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-semibold text-sm">{selectedStory.userName}</p>
                    <p className="text-white/70 text-xs">
                      {Math.floor((Date.now() - selectedStory.createdAt) / (1000 * 60 * 60))}h ago
                    </p>
                  </div>
                </div>
              </div>

              {/* Story Image */}
              <div className="relative w-full h-full">
                <Image
                  src={selectedStory.imageUrl}
                  alt="Story"
                  fill
                  className="object-contain"
                />
                
                {/* Like Animation */}
                {showLikeAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <Heart 
                      className="h-32 w-32 text-white fill-red-500 animate-ping"
                      style={{ animationDuration: '0.6s', animationIterationCount: '1' }}
                    />
                    <Heart 
                      className="absolute h-32 w-32 text-white fill-red-500 animate-bounce"
                      style={{ animationDuration: '0.5s', animationIterationCount: '2' }}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center justify-between">
                  {selectedStory.userEmail === currentUserEmail ? (
                    // Story owner sees only stats
                    <div className="flex items-center gap-4">
                      {selectedStory.views && selectedStory.views.length > 0 && (
                        <span className="text-white text-sm font-semibold">
                          👁️ {selectedStory.views.length} {selectedStory.views.length === 1 ? 'view' : 'views'}
                        </span>
                      )}
                      {selectedStory.likes && selectedStory.likes.length > 0 && (
                        <span className="text-white text-sm font-semibold">
                          ❤️ {selectedStory.likes.length} {selectedStory.likes.length === 1 ? 'like' : 'likes'}
                        </span>
                      )}
                    </div>
                  ) : (
                    // Other users see like button
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleLike(selectedStory)}
                        className="text-white hover:scale-110 transition-transform"
                      >
                        <Heart 
                          className={`h-7 w-7 ${selectedStory.likes?.includes(currentUserEmail || '') ? 'fill-red-500 text-red-500' : ''}`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
