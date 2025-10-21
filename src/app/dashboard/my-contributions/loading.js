"use client";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="flex flex-col items-center gap-6">
        {/* Modern animated spinner */}
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-200 dark:border-orange-800"></div>
          <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-t-orange-500 border-r-transparent border-b-orange-600 border-l-transparent animate-pulse"></div>
          <div className="absolute inset-2 h-12 w-12 animate-spin rounded-full border-2 border-pink-300 dark:border-pink-700 animate-reverse"></div>
        </div>

        {/* Loading text with typing animation */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            Loading Contributions...
          </h2>
          <p className="text-sm text-muted-foreground animate-pulse">
            Fetching your added places
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
