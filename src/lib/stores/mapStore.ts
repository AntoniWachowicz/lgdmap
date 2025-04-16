// src/lib/stores/mapStore.ts
import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { persistentWritable } from './persistentStore';

// Type definitions
export interface PinContent {
  type: 'text' | 'image' | 'video' | 'pdf';
  value: string;
  title?: string;
}

export interface Pin {
  id: string;
  position: [number, number]; // [lat, lng]
  title: string;
  mainTag: string;
  supportingTags: string[];
  content: PinContent[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface RegionBoundary {
  coordinates: [number, number][];
  minZoom: number;
  maxZoom: number;
  name: string;
}

export interface MapSettings {
  defaultCenter: [number, number];
  defaultZoom: number;
  allowedContentTypes: ('text' | 'image' | 'video' | 'pdf')[];
  contentDisplayOrder: string[];
  enabledFilters: string[];
  enabledSorting: string[];
}

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

// Custom serializer and deserializer for date handling
const storeOptions = {
  serialize: (value: any) => JSON.stringify(value),
  deserialize: (text: string) => JSON.parse(text)
};

// Create stores with our custom persistent store
export const pins: Writable<Pin[]> = persistentWritable('pins', [], storeOptions);
export const regionBoundary: Writable<RegionBoundary | null> = persistentWritable('regionBoundary', null, storeOptions);
export const mapSettings: Writable<MapSettings> = persistentWritable('mapSettings', {
  defaultCenter: [52.0977, 19.0258], // Default center of Poland
  defaultZoom: 6,
  allowedContentTypes: ['text', 'image', 'video', 'pdf'],
  contentDisplayOrder: ['text', 'image', 'video', 'pdf'],
  enabledFilters: ['title', 'mainTag', 'supportingTags', 'createdAt'],
  enabledSorting: ['title', 'mainTag', 'createdAt', 'updatedAt']
}, storeOptions);
export const tags: Writable<TagDefinition[]> = persistentWritable('tags', [
  { id: '1', name: 'culture', color: '#FF5733' },
  { id: '2', name: 'environment', color: '#33FF57' },
  { id: '3', name: 'health', color: '#3357FF' },
  { id: '4', name: 'education', color: '#F033FF' },
  { id: '5', name: 'infrastructure', color: '#FF9933' },
  { id: '6', name: 'community', color: '#33FFF9' }
], storeOptions);

// Session-only stores (not persisted)
export const isAdminMode = writable(false);
export const selectedPinId = writable<string | null>(null);
export const filterTags = writable<string[]>([]);
export const viewMode = writable<'map' | 'list'>('map');

// Helper functions

// Add a new pin
export function addPin(pin: Omit<Pin, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  
  const newPin: Pin = {
    ...pin,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };
  
  pins.update(currentPins => [...currentPins, newPin]);
  return newPin.id;
}

// Update an existing pin
export function updatePin(id: string, updates: Partial<Omit<Pin, 'id' | 'createdAt' | 'updatedAt'>>) {
  pins.update(currentPins => {
    return currentPins.map(pin => {
      if (pin.id === id) {
        return {
          ...pin,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return pin;
    });
  });
}

// Delete a pin
export function deletePin(id: string) {
  pins.update(currentPins => currentPins.filter(pin => pin.id !== id));
}

// Set region boundary
export function setRegionBoundary(boundary: RegionBoundary) {
  regionBoundary.set(boundary);
}

// Add a new tag
export function addTag(name: string, color: string) {
  const newTag: TagDefinition = {
    id: generateId(),
    name,
    color
  };
  
  tags.update(currentTags => [...currentTags, newTag]);
  return newTag.id;
}

// Update a tag
export function updateTag(id: string, updates: Partial<Omit<TagDefinition, 'id'>>) {
  tags.update(currentTags => {
    return currentTags.map(tag => {
      if (tag.id === id) {
        return { ...tag, ...updates };
      }
      return tag;
    });
  });
}

// Delete a tag
export function deleteTag(id: string) {
  tags.update(currentTags => currentTags.filter(tag => tag.id !== id));
}

// Get filtered pins based on selected tags
export function getFilteredPins(): Pin[] {
  const allPins = get(pins);
  const selectedTags = get(filterTags);
  
  if (selectedTags.length === 0) {
    return allPins;
  }
  
  return allPins.filter(pin => 
    selectedTags.includes(pin.mainTag) || 
    pin.supportingTags.some(tag => selectedTags.includes(tag))
  );
}

// Helper to generate random ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);}