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
  addedByUserId?: string;
  addedByEmail?: string;
  addedOn?: string;
  added_on?: string;
  tags?: string[];
  tips?: string;
}

export type AuthProvider = 'email' | 'google';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: AuthProvider;
  createdAt: string;
  lastLoginAt: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthAvailability {
  emailOtpEnabled: boolean;
  googleEnabled: boolean;
}
