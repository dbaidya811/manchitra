export type CategoryType =
  | 'popular'
  | 'north_kolkata'
  | 'south_kolkata'
  | 'central_kolkata'
  | 'bidhannagar'
  | 'shovabazar'
  | 'alipore_port'
  | 'northern_suburbs'
  | 'southern_suburbs'
  | string;

export type NavigationTab = 'home' | 'map' | 'add' | 'guide' | 'profile';

export interface Place {
  id: string;
  name: string;
  subTitle?: string;
  district?: string;
  division?: string;
  category?: CategoryType;
  zone?: string;
  coordinates: [number, number]; // [lat, lng]
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  image: string;
  images?: string[];
  local_images?: string[];
  sourceUrl?: string;
  source_url?: string;
  description: string;
  highlights?: string[];
  bestTimeToVisit?: string;
  entryFee?: string;
  distanceKm?: number;
  isFavorite: boolean;
  isPopular?: boolean;
  addedBy?: string;
  addedOn?: string;
  added_on?: string;
  tags?: string[];
  tips?: string;
}

export interface UserProfile {
  name: string;
  username: string;
  level: string;
  levelNumber: number;
  avatar: string;
  contributionsCount: number;
  visitedCount: number;
  savedCount: number;
  badges: {
    id: string;
    title: string;
    icon: string;
    unlocked: boolean;
  }[];
}
