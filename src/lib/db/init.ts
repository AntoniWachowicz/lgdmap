// src/lib/db/init.ts
import db from './client';
import type { TagDefinition } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// Initial data for the database
const initialTags: TagDefinition[] = [
  { id: '1', name: 'culture', color: '#FF5733' },
  { id: '2', name: 'environment', color: '#33FF57' },
  { id: '3', name: 'health', color: '#3357FF' },
  { id: '4', name: 'education', color: '#F033FF' },
  { id: '5', name: 'infrastructure', color: '#FF9933' },
  { id: '6', name: 'community', color: '#33FFF9' }
];

const initialMapSettings = {
  default_center: [52.0977, 19.0258] as [number, number], // Explicit tuple type
  default_zoom: 6,
  allowed_content_types: ['text', 'image', 'video', 'pdf'],
  content_display_order: ['text', 'image', 'video', 'pdf'],
  enabled_filters: ['title', 'mainTag', 'supportingTags', 'createdAt'],
  enabled_sorting: ['title', 'mainTag', 'createdAt', 'updatedAt']
};

// Sample pins data
const samplePins = [
  {
    id: 'pin1',
    title: 'Community Center Renovation',
    position_lat: 52.2297,
    position_lng: 21.0122, // Warsaw
    main_tag: 'culture',
    supporting_tags: ['education', 'community'],
    content: [
      { 
        type: 'text' as const, 
        value: 'This project renovated the local community center to provide better facilities for cultural events.',
        title: 'Description'
      },
      {
        type: 'image' as const,
        value: 'https://via.placeholder.com/400x300',
        title: 'Community Center'
      }
    ]
  },
  {
    id: 'pin2',
    title: 'Public Park Improvements',
    position_lat: 50.0647,
    position_lng: 19.9450, // Krakow
    main_tag: 'environment',
    supporting_tags: ['recreation', 'health'],
    content: [
      {
        type: 'text' as const,
        value: 'Adding new recreational facilities and green spaces to the central public park.',
        title: 'Description'
      },
      {
        type: 'video' as const,
        value: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        title: 'Park Tour'
      }
    ]
  },
  {
    id: 'pin3',
    title: 'Healthcare Clinic Expansion',
    position_lat: 51.1079,
    position_lng: 17.0385, // Wroclaw
    main_tag: 'health',
    supporting_tags: ['infrastructure'],
    content: [
      {
        type: 'text' as const,
        value: 'Expansion of the local healthcare clinic to serve more patients and provide additional medical services.',
        title: 'Description'
      },
      {
        type: 'pdf' as const,
        value: 'https://example.com/sample.pdf',
        title: 'Project Documentation'
      }
    ]
  }
];

// Sample region boundary (rough outline of Poland)
const sampleBoundary = {
  name: 'Poland',
  coordinates: [
    [54.8, 14.2], // Northwest
    [54.8, 23.0], // Northeast
    [49.0, 23.0], // Southeast
    [49.0, 14.2], // Southwest
    [54.8, 14.2]  // Close the polygon
  ] as [number, number][], // Explicit tuple array type
  min_zoom: 5,
  max_zoom: 18
};

/**
 * Initialize the database with tables and initial data
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database...');
    
    // Create tables
    await db.initDatabase();
    
    // Insert initial tags
    for (const tag of initialTags) {
      await db.createTag(tag);
    }
    
    // Insert initial map settings
    await db.updateMapSettings(initialMapSettings);
    
    // Insert sample region boundary
    await db.setRegionBoundary(sampleBoundary);
    
    // Insert sample pins
    for (const pin of samplePins) {
      const createdPinResult = await db.createPin({
        id: pin.id,
        title: pin.title,
        position_lat: pin.position_lat,
        position_lng: pin.position_lng,
        main_tag: pin.main_tag,
        content: pin.content
      });
      
      if (!createdPinResult || createdPinResult.length === 0) {
        console.warn(`Failed to create pin ${pin.id}`);
        continue;
      }
      
      const createdPin = createdPinResult[0];
      
      // Add supporting tags
      for (const tag of pin.supporting_tags) {
        await db.addPinSupportingTag(createdPin.id, tag);
      }
    }
    
    console.log('Database initialization completed successfully');
  } catch (error: unknown) {
    console.error('Error initializing database:', error);
    throw new Error(toErrorMessage(error));
  }
}

export default initializeDatabase;