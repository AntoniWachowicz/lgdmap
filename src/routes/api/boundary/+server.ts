import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db/client';
import type { RegionBoundary, DatabaseRegionBoundary } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// GET /api/boundary
export const GET: RequestHandler = async () => {
  try {
    const dbBoundary = await db.getRegionBoundary();
    
    if (!dbBoundary) {
      return json({ error: 'No region boundary defined' }, { status: 404 });
    }
    
    // Transform to frontend format
    const responseBoundary: RegionBoundary = {
      name: dbBoundary.name,
      coordinates: dbBoundary.coordinates as [number, number][],
      minZoom: dbBoundary.min_zoom,
      maxZoom: dbBoundary.max_zoom
    };
    
    return json(responseBoundary);
  } catch (error: unknown) {
    console.error('Error fetching region boundary:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// PUT /api/boundary
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.coordinates || !Array.isArray(data.coordinates)) {
      return json(
        { error: 'Name and coordinates are required fields' }, 
        { status: 400 }
      );
    }
    
    // Check coordinates format
    if (data.coordinates.some((coord: any) => !Array.isArray(coord) || coord.length !== 2)) {
      return json(
        { error: 'Coordinates must be an array of [lat, lng] pairs' }, 
        { status: 400 }
      );
    }
    
    // Prepare boundary data for database
    const boundary: DatabaseRegionBoundary = {
      name: data.name,
      coordinates: data.coordinates as [number, number][],
      min_zoom: data.minZoom || 5,
      max_zoom: data.maxZoom || 18
    };
    
    // Update the boundary
    const updatedBoundaryResult = await db.setRegionBoundary(boundary);
    
    if (!updatedBoundaryResult || updatedBoundaryResult.length === 0) {
      return json({ error: 'Failed to update boundary' }, { status: 500 });
    }
    
    const updatedDbBoundary = updatedBoundaryResult[0];
    
    // Transform to frontend format
    const responseBoundary: RegionBoundary = {
      name: updatedDbBoundary.name,
      coordinates: updatedDbBoundary.coordinates as [number, number][],
      minZoom: updatedDbBoundary.min_zoom,
      maxZoom: updatedDbBoundary.max_zoom
    };
    
    return json(responseBoundary);
  } catch (error: unknown) {
    console.error('Error updating region boundary:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// DELETE /api/boundary
export const DELETE: RequestHandler = async () => {
  try {
    await db.query('DELETE FROM region_boundaries');
    return json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting region boundary:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};