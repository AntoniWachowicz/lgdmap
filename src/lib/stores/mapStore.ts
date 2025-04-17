// src/lib/stores/mapStore.ts
import { writable, get, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { persistentWritable } from './persistentStore';
import { browser } from '$app/environment';
import { generateId } from '$lib/utils';
import type { Pin, TagDefinition, RegionBoundary, MapSettings } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// Loading states
export const isLoadingPins = writable(false);
export const isLoadingTags = writable(false);
export const isLoadingBoundary = writable(false);
export const isLoadingSettings = writable(false);

// Error states
export const pinsError = writable<string | null>(null);
export const tagsError = writable<string | null>(null);
export const boundaryError = writable<string | null>(null);
export const settingsError = writable<string | null>(null);

// Data stores (still use persistent store for offline capability)
export const pins: Writable<Pin[]> = persistentWritable('pins', []);
export const regionBoundary: Writable<RegionBoundary | null> = persistentWritable('regionBoundary', null);
export const mapSettings: Writable<MapSettings> = persistentWritable('mapSettings', {
  defaultCenter: [52.0977, 19.0258], // Default center of Poland
  defaultZoom: 6,
  allowedContentTypes: ['text', 'image', 'video', 'pdf'],
  contentDisplayOrder: ['text', 'image', 'video', 'pdf'],
  enabledFilters: ['title', 'mainTag', 'supportingTags', 'createdAt'],
  enabledSorting: ['title', 'mainTag', 'createdAt', 'updatedAt']
});
export const tags: Writable<TagDefinition[]> = persistentWritable('tags', [
  { id: '1', name: 'culture', color: '#FF5733' },
  { id: '2', name: 'environment', color: '#33FF57' },
  { id: '3', name: 'health', color: '#3357FF' },
  { id: '4', name: 'education', color: '#F033FF' },
  { id: '5', name: 'infrastructure', color: '#FF9933' },
  { id: '6', name: 'community', color: '#33FFF9' }
]);

// Session-only stores (not persisted)
export const isAdminMode = writable(false);
export const selectedPinId = writable<string | null>(null);
export const filterTags = writable<string[]>([]);
export const viewMode = writable<'map' | 'list'>('map');

// Derived store for filtered pins
export const filteredPins: Readable<Pin[]> = derived(
  [pins, filterTags],
  ([$pins, $filterTags]) => {
    if ($filterTags.length === 0) {
      return $pins;
    }
    
    return $pins.filter(pin => 
      $filterTags.includes(pin.mainTag) || 
      pin.supportingTags.some(tag => $filterTags.includes(tag))
    );
  }
);

// Derived store for selected pin
export const selectedPin: Readable<Pin | null> = derived(
  [pins, selectedPinId],
  ([$pins, $selectedPinId]) => {
    if (!$selectedPinId) return null;
    return $pins.find(pin => pin.id === $selectedPinId) || null;
  }
);

// API Functions

/**
 * Load all pins from the API
 */
export async function loadPins(): Promise<void> {
  if (!browser) return;
  
  isLoadingPins.set(true);
  pinsError.set(null);
  
  try {
    const response = await fetch('/api/pins');
    
    if (!response.ok) {
      throw new Error(`Failed to load pins: ${response.statusText}`);
    }
    
    const data = await response.json() as Pin[];
    pins.set(data);
  } catch (error: unknown) {
    console.error('Error loading pins:', error);
    pinsError.set(toErrorMessage(error));
  } finally {
    isLoadingPins.set(false);
  }
}

/**
 * Load all tags from the API
 */
export async function loadTags(): Promise<void> {
  if (!browser) return;
  
  isLoadingTags.set(true);
  tagsError.set(null);
  
  try {
    const response = await fetch('/api/tags');
    
    if (!response.ok) {
      throw new Error(`Failed to load tags: ${response.statusText}`);
    }
    
    const data = await response.json() as TagDefinition[];
    tags.set(data);
  } catch (error: unknown) {
    console.error('Error loading tags:', error);
    tagsError.set(toErrorMessage(error));
  } finally {
    isLoadingTags.set(false);
  }
}

/**
 * Load region boundary from the API
 */
export async function loadRegionBoundary(): Promise<void> {
  if (!browser) return;
  
  isLoadingBoundary.set(true);
  boundaryError.set(null);
  
  try {
    const response = await fetch('/api/boundary');
    
    if (response.status === 404) {
      // No boundary defined
      regionBoundary.set(null);
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load region boundary: ${response.statusText}`);
    }
    
    const data = await response.json() as RegionBoundary;
    regionBoundary.set(data);
  } catch (error: unknown) {
    console.error('Error loading region boundary:', error);
    boundaryError.set(toErrorMessage(error));
  } finally {
    isLoadingBoundary.set(false);
  }
}

/**
 * Load map settings from the API
 */
export async function loadMapSettings(): Promise<void> {
  if (!browser) return;
  
  isLoadingSettings.set(true);
  settingsError.set(null);
  
  try {
    const response = await fetch('/api/settings');
    
    if (response.status === 404) {
      // No settings defined, use defaults
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load map settings: ${response.statusText}`);
    }
    
    const data = await response.json() as MapSettings;
    mapSettings.set(data);
  } catch (error: unknown) {
    console.error('Error loading map settings:', error);
    settingsError.set(toErrorMessage(error));
  } finally {
    isLoadingSettings.set(false);
  }
}

/**
 * Load all data from the API
 */
export async function loadAllData(): Promise<void> {
  await Promise.all([
    loadPins(),
    loadTags(),
    loadRegionBoundary(),
    loadMapSettings()
  ]);
}

/**
 * Add a new pin
 * @param pin Pin data without ID
 * @returns The created pin ID or null if failed
 */
export async function addPin(pin: Omit<Pin, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
  if (!browser) return null;
  
  isLoadingPins.set(true);
  pinsError.set(null);
  
  try {
    const pinData = {
      ...pin,
      id: generateId()
    };
    
    const response = await fetch('/api/pins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pinData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add pin: ${response.statusText}`);
    }
    
    const createdPin = await response.json() as Pin;
    
    if (!createdPin || !createdPin.id) {
      throw new Error('Invalid response when creating pin');
    }
    
    // Update local store
    pins.update(currentPins => [...currentPins, createdPin]);
    
    return createdPin.id;
  } catch (error: unknown) {
    console.error('Error adding pin:', error);
    pinsError.set(toErrorMessage(error));
    return null;
  } finally {
    isLoadingPins.set(false);
  }
}

/**
 * Update an existing pin
 * @param id Pin ID
 * @param updates Partial pin data
 */
export async function updatePin(id: string, updates: Partial<Omit<Pin, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!browser || !id) return;
  
  isLoadingPins.set(true);
  pinsError.set(null);
  
  try {
    const response = await fetch(`/api/pins/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update pin: ${response.statusText}`);
    }
    
    const updatedPin = await response.json() as Pin;
    
    if (!updatedPin || !updatedPin.id) {
      throw new Error('Invalid response when updating pin');
    }
    
    // Update local store
    pins.update(currentPins => 
      currentPins.map(pin => pin.id === id ? updatedPin : pin)
    );
  } catch (error: unknown) {
    console.error('Error updating pin:', error);
    pinsError.set(toErrorMessage(error));
  } finally {
    isLoadingPins.set(false);
  }
}

/**
 * Delete a pin
 * @param id Pin ID
 */
export async function deletePin(id: string): Promise<void> {
  if (!browser || !id) return;
  
  isLoadingPins.set(true);
  pinsError.set(null);
  
  try {
    const response = await fetch(`/api/pins/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete pin: ${response.statusText}`);
    }
    
    // Update local store
    pins.update(currentPins => currentPins.filter(pin => pin.id !== id));
    
    // If the deleted pin was selected, clear selection
    if (get(selectedPinId) === id) {
      selectedPinId.set(null);
    }
  } catch (error: unknown) {
    console.error('Error deleting pin:', error);
    pinsError.set(toErrorMessage(error));
  } finally {
    isLoadingPins.set(false);
  }
}

/**
 * Add a new tag
 * @param name Tag name
 * @param color Tag color
 * @returns Tag ID or null if failed
 */
export async function addTag(name: string, color: string): Promise<string | null> {
  if (!browser || !name) return null;
  
  isLoadingTags.set(true);
  tagsError.set(null);
  
  try {
    const tagData = {
      id: generateId(),
      name,
      color
    };
    
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tagData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add tag: ${response.statusText}`);
    }
    
    const createdTag = await response.json() as TagDefinition;
    
    if (!createdTag || !createdTag.id) {
      throw new Error('Invalid response when creating tag');
    }
    
    // Update local store
    tags.update(currentTags => [...currentTags, createdTag]);
    
    return createdTag.id;
  } catch (error: unknown) {
    console.error('Error adding tag:', error);
    tagsError.set(toErrorMessage(error));
    return null;
  } finally {
    isLoadingTags.set(false);
  }
}

/**
 * Update a tag
 * @param id Tag ID
 * @param updates Partial tag data
 */
export async function updateTag(id: string, updates: Partial<Omit<TagDefinition, 'id'>>): Promise<void> {
  if (!browser || !id) return;
  
  isLoadingTags.set(true);
  tagsError.set(null);
  
  try {
    const response = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update tag: ${response.statusText}`);
    }
    
    const updatedTag = await response.json() as TagDefinition;
    
    if (!updatedTag || !updatedTag.id) {
      throw new Error('Invalid response when updating tag');
    }
    
    // Update local store
    tags.update(currentTags => 
      currentTags.map(tag => tag.id === id ? updatedTag : tag)
    );
  } catch (error: unknown) {
    console.error('Error updating tag:', error);
    tagsError.set(toErrorMessage(error));
  } finally {
    isLoadingTags.set(false);
  }
}

/**
 * Delete a tag
 * @param id Tag ID
 */
export async function deleteTag(id: string): Promise<void> {
  if (!browser || !id) return;
  
  isLoadingTags.set(true);
  tagsError.set(null);
  
  try {
    const response = await fetch(`/api/tags/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete tag: ${response.statusText}`);
    }
    
    // Update local store
    tags.update(currentTags => currentTags.filter(tag => tag.id !== id));
  } catch (error: unknown) {
    console.error('Error deleting tag:', error);
    tagsError.set(toErrorMessage(error));
  } finally {
    isLoadingTags.set(false);
  }
}

/**
 * Set the region boundary
 * @param boundary Region boundary data
 */
export async function setRegionBoundary(boundary: RegionBoundary): Promise<void> {
  if (!browser || !boundary) return;
  
  isLoadingBoundary.set(true);
  boundaryError.set(null);
  
  try {
    const response = await fetch('/api/boundary', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(boundary)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set region boundary: ${response.statusText}`);
    }
    
    const updatedBoundary = await response.json() as RegionBoundary;
    
    if (!updatedBoundary) {
      throw new Error('Invalid response when setting region boundary');
    }
    
    // Update local store
    regionBoundary.set(updatedBoundary);
  } catch (error: unknown) {
    console.error('Error setting region boundary:', error);
    boundaryError.set(toErrorMessage(error));
  } finally {
    isLoadingBoundary.set(false);
  }
}

/**
 * Delete the region boundary
 */
export async function deleteRegionBoundary(): Promise<void> {
  if (!browser) return;
  
  isLoadingBoundary.set(true);
  boundaryError.set(null);
  
  try {
    const response = await fetch('/api/boundary', {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete region boundary: ${response.statusText}`);
    }
    
    // Update local store
    regionBoundary.set(null);
  } catch (error: unknown) {
    console.error('Error deleting region boundary:', error);
    boundaryError.set(toErrorMessage(error));
  } finally {
    isLoadingBoundary.set(false);
  }
}

/**
 * Update map settings
 * @param settings Map settings data
 */
export async function updateMapSettings(settings: Partial<MapSettings>): Promise<void> {
  if (!browser || !settings) return;
  
  isLoadingSettings.set(true);
  settingsError.set(null);
  
  try {
    // Get current settings to merge with updates
    const currentSettings = get(mapSettings);
    const updatedSettings = { ...currentSettings, ...settings };
    
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSettings)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update map settings: ${response.statusText}`);
    }
    
    const responseSettings = await response.json() as MapSettings;
    
    if (!responseSettings) {
      throw new Error('Invalid response when updating map settings');
    }
    
    // Update local store
    mapSettings.set(responseSettings);
  } catch (error: unknown) {
    console.error('Error updating map settings:', error);
    settingsError.set(toErrorMessage(error));
  } finally {
    isLoadingSettings.set(false);
  }
}

// Initialize data on app start (in the browser only)
if (browser) {
  loadAllData().catch((error: unknown) => {
    console.error('Error loading initial data:', error);
  });
}