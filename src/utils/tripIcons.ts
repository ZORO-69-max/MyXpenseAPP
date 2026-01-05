import { 
  Plane, 
  Mountain, 
  Palmtree, 
  Ship, 
  Train, 
  Car, 
  Bike, 
  Coffee,
  ShoppingBag,
  Home,
  Building2,
  Music,
  Camera,
  Utensils,
  MapPin,
  Compass,
  Tent,
  Sunset,
  Hotel,
  Globe
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TripIconConfig {
  icon: LucideIcon;
  color: string;
}

const tripIconMap: Record<string, TripIconConfig> = {
  plane: { icon: Plane, color: 'from-blue-500 to-cyan-500' },
  flight: { icon: Plane, color: 'from-blue-500 to-cyan-500' },
  airport: { icon: Plane, color: 'from-blue-500 to-cyan-500' },
  mountain: { icon: Mountain, color: 'from-green-500 to-emerald-500' },
  hiking: { icon: Mountain, color: 'from-green-500 to-emerald-500' },
  trek: { icon: Mountain, color: 'from-green-500 to-emerald-500' },
  beach: { icon: Palmtree, color: 'from-orange-500 to-amber-500' },
  goa: { icon: Palmtree, color: 'from-orange-500 to-amber-500' },
  island: { icon: Palmtree, color: 'from-orange-500 to-amber-500' },
  cruise: { icon: Ship, color: 'from-blue-600 to-indigo-500' },
  ship: { icon: Ship, color: 'from-blue-600 to-indigo-500' },
  boat: { icon: Ship, color: 'from-blue-600 to-indigo-500' },
  train: { icon: Train, color: 'from-purple-500 to-pink-500' },
  railway: { icon: Train, color: 'from-purple-500 to-pink-500' },
  car: { icon: Car, color: 'from-red-500 to-rose-500' },
  road: { icon: Car, color: 'from-red-500 to-rose-500' },
  drive: { icon: Car, color: 'from-red-500 to-rose-500' },
  bike: { icon: Bike, color: 'from-yellow-500 to-orange-500' },
  cycling: { icon: Bike, color: 'from-yellow-500 to-orange-500' },
  cafe: { icon: Coffee, color: 'from-amber-600 to-orange-600' },
  coffee: { icon: Coffee, color: 'from-amber-600 to-orange-600' },
  shopping: { icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  mall: { icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  home: { icon: Home, color: 'from-slate-500 to-gray-500' },
  house: { icon: Home, color: 'from-slate-500 to-gray-500' },
  city: { icon: Building2, color: 'from-gray-600 to-slate-600' },
  urban: { icon: Building2, color: 'from-gray-600 to-slate-600' },
  concert: { icon: Music, color: 'from-purple-600 to-violet-600' },
  music: { icon: Music, color: 'from-purple-600 to-violet-600' },
  festival: { icon: Music, color: 'from-purple-600 to-violet-600' },
  photo: { icon: Camera, color: 'from-blue-500 to-purple-500' },
  photography: { icon: Camera, color: 'from-blue-500 to-purple-500' },
  camera: { icon: Camera, color: 'from-blue-500 to-purple-500' },
  food: { icon: Utensils, color: 'from-red-500 to-orange-500' },
  restaurant: { icon: Utensils, color: 'from-red-500 to-orange-500' },
  dining: { icon: Utensils, color: 'from-red-500 to-orange-500' },
  map: { icon: MapPin, color: 'from-red-600 to-pink-600' },
  location: { icon: MapPin, color: 'from-red-600 to-pink-600' },
  explore: { icon: Compass, color: 'from-teal-500 to-cyan-500' },
  adventure: { icon: Compass, color: 'from-teal-500 to-cyan-500' },
  camping: { icon: Tent, color: 'from-green-600 to-lime-600' },
  camp: { icon: Tent, color: 'from-green-600 to-lime-600' },
  sunset: { icon: Sunset, color: 'from-orange-500 to-red-500' },
  evening: { icon: Sunset, color: 'from-orange-500 to-red-500' },
  hotel: { icon: Hotel, color: 'from-indigo-500 to-blue-500' },
  stay: { icon: Hotel, color: 'from-indigo-500 to-blue-500' },
  world: { icon: Globe, color: 'from-blue-500 to-teal-500' },
  international: { icon: Globe, color: 'from-blue-500 to-teal-500' },
  global: { icon: Globe, color: 'from-blue-500 to-teal-500' },
};

const defaultIcon: TripIconConfig = { 
  icon: MapPin, 
  color: 'from-blue-500 to-teal-500' 
};

export const getTripIcon = (tripName: string): TripIconConfig => {
  const lowerName = tripName.toLowerCase();
  
  for (const [keyword, config] of Object.entries(tripIconMap)) {
    if (lowerName.includes(keyword)) {
      return config;
    }
  }
  
  return defaultIcon;
};
