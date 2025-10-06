"use client";

import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  placeId: number;
  currentRating?: number;
  totalRatings?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ 
  placeId, 
  currentRating = 0, 
  totalRatings = 0,
  onRate, 
  readonly = false,
  size = "md" 
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const [userRating, setUserRating] = useState(0);

  const handleClick = (rating: number) => {
    if (readonly) return;
    setUserRating(rating);
    onRate?.(rating);
  };

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          className={`transition-all duration-200 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
        >
          <Star
            className={`${sizeClasses[size]} transition-colors ${
              star <= (hover || userRating || currentRating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-300 dark:fill-gray-700 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
      {totalRatings > 0 && (
        <span className="ml-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
          ({totalRatings})
        </span>
      )}
    </div>
  );
}
