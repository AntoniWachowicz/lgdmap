import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db/client';
import type { MapSettings, DatabaseMapSettings } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// GET /api/settings
export const GET: RequestHandler = async () => {
  try {
    const dbSettings = await db.getMapSettings();
    
    if (!dbSettings) {
      return json({ error: 'No map settings defined' }, { status: 404 });
    }
    
    // Transform to frontend format
    const responseSettings: MapSettings = {
      defaultCenter: dbSettings.default_center as [number, number],
      defaultZoom: dbSettings.default_zoom,
      allowedContentTypes: dbSettings.allowed_content_types,
      contentDisplayOrder: dbSettings.content_display_order,
      enabledFilters: dbSettings.enabled_filters,
      enabledSorting: dbSettings.enabled_sorting
    };
    
    return json(responseSettings);
  } catch (error: unknown) {
    console.error('Error fetching map settings:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// PUT /api/settings
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.defaultCenter || !Array.isArray(data.defaultCenter) || 
        data.defaultZoom === undefined) {
      return json(
        { error: 'defaultCenter and defaultZoom are required fields' }, 
        { status: 400 }
      );
    }
    
    // Prepare settings data for database
    const settings: DatabaseMapSettings = {
      default_center: data.defaultCenter as [number, number],
      default_zoom: data.defaultZoom,
      allowed_content_types: Array.isArray(data.allowedContentTypes) ? 
        data.allowedContentTypes : ['text', 'image', 'video', 'pdf'],
      content_display_order: Array.isArray(data.contentDisplayOrder) ? 
        data.contentDisplayOrder : ['text', 'image', 'video', 'pdf'],
      enabled_filters: Array.isArray(data.enabledFilters) ? 
        data.enabledFilters : ['title', 'mainTag', 'supportingTags', 'createdAt'],
      enabled_sorting: Array.isArray(data.enabledSorting) ? 
        data.enabledSorting : ['title', 'mainTag', 'createdAt', 'updatedAt']
    };
    
    // Update the settings
    const updatedSettingsResult = await db.updateMapSettings(settings);
    
    if (!updatedSettingsResult || updatedSettingsResult.length === 0) {
      return json({ error: 'Failed to update settings' }, { status: 500 });
    }
    
    const updatedDbSettings = updatedSettingsResult[0];
    
    // Transform to frontend format
    const responseSettings: MapSettings = {
      defaultCenter: updatedDbSettings.default_center as [number, number],
      defaultZoom: updatedDbSettings.default_zoom,
      allowedContentTypes: updatedDbSettings.allowed_content_types,
      contentDisplayOrder: updatedDbSettings.content_display_order,
      enabledFilters: updatedDbSettings.enabled_filters,
      enabledSorting: updatedDbSettings.enabled_sorting
    };
    
    return json(responseSettings);
  } catch (error: unknown) {
    console.error('Error updating map settings:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};