// src/lib/db/client.ts
import { Pool } from '@neondatabase/serverless';
import { dev } from '$app/environment';
import type { DatabasePin, DatabaseRegionBoundary, DatabaseMapSettings, TagDefinition } from '$lib/types';

// Configure the database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
});

// A helper function to execute SQL queries with better typing
export async function query<T>(
  queryText: string, 
  params: any[] = []
): Promise<T[]> {
  if (!queryText) throw new Error('Query text is required');
  
  const client = await pool.connect();
  try {
    const result = await client.query(queryText, params);
    return (result?.rows || []) as T[];
  } catch (error) {
    console.error(`Query error: ${queryText}`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Specific query functions for various entities

// Pins
export async function getPins(): Promise<DatabasePin[]> {
  return query<DatabasePin>(`
    SELECT * FROM pins 
    ORDER BY created_at DESC
  `);
}

export async function getPinById(id: string): Promise<DatabasePin | null> {
  if (!id) throw new Error('Pin ID is required');
  
  const results = await query<DatabasePin>(
    `SELECT * FROM pins WHERE id = $1`,
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

export async function getPinsByTag(tagName: string): Promise<DatabasePin[]> {
  if (!tagName) throw new Error('Tag name is required');
  
  return query<DatabasePin>(`
    SELECT p.* FROM pins p
    WHERE p.main_tag = $1
    OR p.id IN (
      SELECT pin_id FROM pin_supporting_tags
      WHERE tag_name = $1
    )
    ORDER BY p.created_at DESC
  `, [tagName]);
}

export async function createPin(pin: {
  id: string;
  title: string;
  position_lat: number;
  position_lng: number;
  main_tag: string;
  content: any[];
}): Promise<DatabasePin[]> {
  if (!pin || !pin.id) throw new Error('Valid pin data is required');
  
  const { 
    id, 
    title, 
    position_lat, 
    position_lng, 
    main_tag, 
    content 
  } = pin;
  
  return query<DatabasePin>(`
    INSERT INTO pins (
      id, title, position_lat, position_lng, 
      main_tag, content, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `, [id, title, position_lat, position_lng, main_tag, JSON.stringify(content)]);
}

export async function updatePin(id: string, updates: Record<string, any>): Promise<DatabasePin[]> {
  if (!id) throw new Error('Pin ID is required');
  if (!updates || Object.keys(updates).length === 0) throw new Error('Updates are required');
  
  const setClause = Object.keys(updates)
    .filter(key => key !== 'id')
    .map((key, i) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // Convert camelCase to snake_case
      return `${dbKey} = $${i + 2}`;
    })
    .join(', ');
  
  const values = [id, ...Object.values(updates).filter((_, i) => Object.keys(updates)[i] !== 'id')];
  
  return query<DatabasePin>(`
    UPDATE pins 
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, values);
}

export async function deletePin(id: string): Promise<void> {
  if (!id) throw new Error('Pin ID is required');
  
  await query(`DELETE FROM pins WHERE id = $1`, [id]);
}

// Supporting tags
export async function addPinSupportingTag(pinId: string, tagName: string): Promise<any> {
  if (!pinId) throw new Error('Pin ID is required');
  if (!tagName) throw new Error('Tag name is required');
  
  return query(`
    INSERT INTO pin_supporting_tags (pin_id, tag_name)
    VALUES ($1, $2)
    ON CONFLICT (pin_id, tag_name) DO NOTHING
    RETURNING *
  `, [pinId, tagName]);
}

export async function removePinSupportingTag(pinId: string, tagName: string): Promise<void> {
  if (!pinId) throw new Error('Pin ID is required');
  if (!tagName) throw new Error('Tag name is required');
  
  await query(`
    DELETE FROM pin_supporting_tags 
    WHERE pin_id = $1 AND tag_name = $2
  `, [pinId, tagName]);
}

// Tags
export async function getTags(): Promise<TagDefinition[]> {
  return query<TagDefinition>(`SELECT * FROM tags ORDER BY name`);
}

export async function getTagByName(name: string): Promise<TagDefinition | null> {
  if (!name) throw new Error('Tag name is required');
  
  const results = await query<TagDefinition>(
    `SELECT * FROM tags WHERE name = $1`,
    [name]
  );
  return results.length > 0 ? results[0] : null;
}

export async function createTag(tag: {
  id: string;
  name: string;
  color: string;
}): Promise<TagDefinition[]> {
  if (!tag || !tag.id || !tag.name) throw new Error('Valid tag data is required');
  
  const { id, name, color } = tag;
  
  return query<TagDefinition>(`
    INSERT INTO tags (id, name, color)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE
    SET color = $3
    RETURNING *
  `, [id, name, color]);
}

export async function updateTag(id: string, updates: Partial<TagDefinition>): Promise<TagDefinition[]> {
  if (!id) throw new Error('Tag ID is required');
  if (!updates) throw new Error('Updates are required');
  
  const { name, color } = updates;
  
  return query<TagDefinition>(`
    UPDATE tags
    SET name = $2, color = $3
    WHERE id = $1
    RETURNING *
  `, [id, name || '', color || '']);
}

export async function deleteTag(id: string): Promise<void> {
  if (!id) throw new Error('Tag ID is required');
  
  await query(`DELETE FROM tags WHERE id = $1`, [id]);
}

// Region boundaries
export async function getRegionBoundary(): Promise<DatabaseRegionBoundary | null> {
  const results = await query<DatabaseRegionBoundary>(`
    SELECT * FROM region_boundaries
    LIMIT 1
  `);
  return results.length > 0 ? results[0] : null;
}

export async function setRegionBoundary(boundary: {
  name: string;
  coordinates: [number, number][];
  min_zoom: number;
  max_zoom: number;
}): Promise<DatabaseRegionBoundary[]> {
  if (!boundary || !boundary.name || !boundary.coordinates) {
    throw new Error('Valid boundary data is required');
  }
  
  const { 
    name, 
    coordinates, 
    min_zoom, 
    max_zoom 
  } = boundary;

  // Delete any existing boundary first (we only support one for now)
  await query(`DELETE FROM region_boundaries`);
  
  return query<DatabaseRegionBoundary>(`
    INSERT INTO region_boundaries (name, coordinates, min_zoom, max_zoom)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [name, JSON.stringify(coordinates), min_zoom, max_zoom]);
}

// Map settings
export async function getMapSettings(): Promise<DatabaseMapSettings | null> {
  const results = await query<DatabaseMapSettings>(`
    SELECT * FROM map_settings
    LIMIT 1
  `);
  return results.length > 0 ? results[0] : null;
}

export async function updateMapSettings(settings: {
  default_center: [number, number];
  default_zoom: number;
  allowed_content_types: string[];
  content_display_order: string[];
  enabled_filters: string[];
  enabled_sorting: string[];
}): Promise<DatabaseMapSettings[]> {
  if (!settings) throw new Error('Valid settings data is required');
  
  const {
    default_center,
    default_zoom,
    allowed_content_types,
    content_display_order,
    enabled_filters,
    enabled_sorting
  } = settings;
  
  // If no settings exist, create them
  const existingSettings = await getMapSettings();
  
  if (!existingSettings) {
    return query<DatabaseMapSettings>(`
      INSERT INTO map_settings (
        default_center, default_zoom, allowed_content_types,
        content_display_order, enabled_filters, enabled_sorting
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      JSON.stringify(default_center),
      default_zoom,
      JSON.stringify(allowed_content_types),
      JSON.stringify(content_display_order),
      JSON.stringify(enabled_filters),
      JSON.stringify(enabled_sorting)
    ]);
  } else {
    return query<DatabaseMapSettings>(`
      UPDATE map_settings
      SET default_center = $1,
          default_zoom = $2,
          allowed_content_types = $3,
          content_display_order = $4,
          enabled_filters = $5,
          enabled_sorting = $6
      RETURNING *
    `, [
      JSON.stringify(default_center),
      default_zoom,
      JSON.stringify(allowed_content_types),
      JSON.stringify(content_display_order),
      JSON.stringify(enabled_filters),
      JSON.stringify(enabled_sorting)
    ]);
  }
}

// Initialize the database (create tables if they don't exist)
export async function initDatabase(): Promise<void> {
  try {
    // Create pins table
    await query(`
      CREATE TABLE IF NOT EXISTS pins (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        position_lat FLOAT NOT NULL,
        position_lng FLOAT NOT NULL,
        main_tag TEXT NOT NULL,
        content JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    
    // Create tags table
    await query(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL
      )
    `);
    
    // Create pin_supporting_tags table
    await query(`
      CREATE TABLE IF NOT EXISTS pin_supporting_tags (
        pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE,
        tag_name TEXT NOT NULL,
        PRIMARY KEY (pin_id, tag_name)
      )
    `);
    
    // Create region_boundaries table
    await query(`
      CREATE TABLE IF NOT EXISTS region_boundaries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        coordinates JSONB NOT NULL,
        min_zoom INTEGER NOT NULL,
        max_zoom INTEGER NOT NULL
      )
    `);
    
    // Create map_settings table
    await query(`
      CREATE TABLE IF NOT EXISTS map_settings (
        id SERIAL PRIMARY KEY,
        default_center JSONB NOT NULL,
        default_zoom INTEGER NOT NULL,
        allowed_content_types JSONB NOT NULL,
        content_display_order JSONB NOT NULL,
        enabled_filters JSONB NOT NULL,
        enabled_sorting JSONB NOT NULL
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export the initDatabase function so we can call it during app initialization
export default {
  query,
  initDatabase,
  
  // Re-export specific query functions
  getPins,
  getPinById,
  getPinsByTag,
  createPin,
  updatePin,
  deletePin,
  
  getTags,
  getTagByName,
  createTag,
  updateTag,
  deleteTag,
  
  addPinSupportingTag,
  removePinSupportingTag,
  
  getRegionBoundary,
  setRegionBoundary,
  
  getMapSettings,
  updateMapSettings
};