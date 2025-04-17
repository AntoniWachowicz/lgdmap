// src/lib/types/index.ts
export interface PinContent {
    type: 'text' | 'image' | 'video' | 'pdf';
    value: string;
    title?: string;
  }
  
  export interface DatabasePin {
    id: string;
    title: string;
    position_lat: number;
    position_lng: number;
    main_tag: string;
    content: PinContent[];
    created_at: string;
    updated_at: string;
  }
  
  export interface Pin {
    id: string;
    title: string;
    position: [number, number];
    mainTag: string;
    supportingTags: string[];
    content: PinContent[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface TagDefinition {
    id: string;
    name: string;
    color: string;
  }
  
  export interface RegionBoundary {
    name: string;
    coordinates: [number, number][];
    minZoom: number;
    maxZoom: number;
  }
  
  export interface DatabaseRegionBoundary {
    id?: number;
    name: string;
    coordinates: [number, number][];
    min_zoom: number;
    max_zoom: number;
  }
  
  export interface MapSettings {
    defaultCenter: [number, number];
    defaultZoom: number;
    allowedContentTypes: string[];
    contentDisplayOrder: string[];
    enabledFilters: string[];
    enabledSorting: string[];
  }
  
  export interface DatabaseMapSettings {
    id?: number;
    default_center: [number, number];
    default_zoom: number;
    allowed_content_types: string[];
    content_display_order: string[];
    enabled_filters: string[];
    enabled_sorting: string[];
  }
  
  // For safe type conversion/comparison
  export function compareIds(id1: string | number, id2: string | number): boolean {
    return String(id1) === String(id2);
  }
  
  // Utility function to safely cast unknown to Error
  export function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error) || 'Unknown error occurred';
  }