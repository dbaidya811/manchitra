import { Place } from '../types';
import placesJson from './places.json';

// Load all user-provided places from places.json (all demo places removed)
export const INITIAL_PLACES: Place[] = (placesJson as Place[]) || [];

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
