import { Place, UserProfile } from '../types';
import placesJson from './places.json';

// Load all user-provided places from places.json (all demo places removed)
export const INITIAL_PLACES: Place[] = (placesJson as Place[]) || [];

export const INITIAL_USER: UserProfile = {
  name: 'Traveler Explorer',
  username: '@kolkataguide',
  level: 'Kolkata Explorer',
  levelNumber: 1,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  contributionsCount: INITIAL_PLACES.length,
  visitedCount: 0,
  savedCount: 0,
  badges: [
    { id: '1', title: 'Kolkata Explorer', icon: '🌟', unlocked: true },
    { id: '2', title: 'North Heritage Guide', icon: '🏛️', unlocked: true },
    { id: '3', title: 'South City Explorer', icon: '📍', unlocked: true },
    { id: '4', title: 'Salt Lake Tour', icon: '✨', unlocked: true }
  ]
};

// Clean text-only zone categories in English (NO icons, NO "All Place", NO "Hills")
export const ZONE_CATEGORIES = [
  { id: 'popular', label: 'Popular' },
  { id: 'north_kolkata', label: 'North Kolkata' },
  { id: 'south_kolkata', label: 'South Kolkata' },
  { id: 'central_kolkata', label: 'Central Kolkata' },
  { id: 'bidhannagar', label: 'Salt Lake' },
  { id: 'shovabazar', label: 'Shovabazar' },
  { id: 'alipore_port', label: 'Alipore & Port' },
  { id: 'northern_suburbs', label: 'Northern Suburbs' },
  { id: 'southern_suburbs', label: 'Southern Suburbs' }
] as const;

export const POPULAR_SEARCH_TAGS = [
  'Hatibagan',
  'Ekdalia',
  'Dum Dum Park',
  'Kumartuli',
  'Bagbazar',
  'Maddox Square',
  'College Square',
  'Santosh Mitra Square',
  'Suruchi Sangha',
  'Salt Lake'
];
