import { PlaceHolderImages } from "./placeholder-images";

export type ColorPalette = {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  ring: string;
}

export type Theme = {
  colors: Partial<ColorPalette>;
  font: "PT Sans" | "Inter" | "Roboto";
  radius: number;
};

export interface Section<T = Record<string, any>> {
  id: string;
  component: "Hero" | "Features" | "CTA" | "Footer";
  props: T;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  previewImage: (typeof PlaceHolderImages)[number]["id"];
  sections: Section[];
}


export interface SharedPlan {
  id: string;
  name: string;
  description?: string;
  destinations: string[];
  createdAt: number;
  updatedAt: number;
  sharedBy?: string;
}

export interface SavedPlan {
  id: string;
  userEmail?: string;
  name: string;
  description: string;
  destinations: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Place {
  id: number;
  lat: number;
  lon: number;
  location?: string;
  area?: string;
  tags?: {
    name?: string;
    description?: string;
  };
  photos?: Array<{
    preview?: string;
    full?: string;
  }>;
}
