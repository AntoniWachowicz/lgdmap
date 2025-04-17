import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db/client';
import type { Pin, DatabasePin } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// GET /api/pins/[id]
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Pin ID is required' }, { status: 400 });
    }
    
    const pin = await db.getPinById(id);
    
    if (!pin) {
      return json({ error: 'Pin not found' }, { status: 404 });
    }
    
    // Get supporting tags
    const supportingTags = await db.query<{ tag_name: string }>(
      'SELECT tag_name FROM pin_supporting_tags WHERE pin_id = $1',
      [id]
    );
    
    // Transform to frontend format
    const responsePin: Pin = {
      id: pin.id,
      title: pin.title,
      position: [pin.position_lat, pin.position_lng] as [number, number],
      mainTag: pin.main_tag,
      supportingTags: supportingTags.map(tag => tag.tag_name),
      content: pin.content,
      createdAt: pin.created_at,
      updatedAt: pin.updated_at
    };
    
    return json(responsePin);
  } catch (error: unknown) {
    console.error(`Error fetching pin ${params.id}:`, error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// PUT /api/pins/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Pin ID is required' }, { status: 400 });
    }
    
    const data = await request.json();
    
    // Check if pin exists
    const existingPin = await db.getPinById(id);
    if (!existingPin) {
      return json({ error: 'Pin not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updates: Partial<DatabasePin> = {};
    
    if (data.title !== undefined) {
      updates.title = data.title;
    }
    
    if (data.position !== undefined && Array.isArray(data.position)) {
      updates.position_lat = data.position[0];
      updates.position_lng = data.position[1];
    }
    
    if (data.mainTag !== undefined) {
      updates.main_tag = data.mainTag;
    }
    
    if (data.content !== undefined) {
      updates.content = data.content;
    }
    
    // Update the pin
    const updatedPins = await db.updatePin(id, updates);
    
    if (!updatedPins || updatedPins.length === 0) {
      return json({ error: 'Failed to update pin' }, { status: 500 });
    }
    
    const updatedPin = updatedPins[0];
    
    // Update supporting tags if provided
    if (data.supportingTags !== undefined) {
      // Remove existing tags
      await db.query('DELETE FROM pin_supporting_tags WHERE pin_id = $1', [id]);
      
      // Add new tags
      if (Array.isArray(data.supportingTags)) {
        for (const tag of data.supportingTags) {
          await db.addPinSupportingTag(id, tag);
        }
      }
    }
    
    // Get updated supporting tags
    const supportingTags = await db.query<{ tag_name: string }>(
      'SELECT tag_name FROM pin_supporting_tags WHERE pin_id = $1',
      [id]
    );
    
    // Transform to frontend format
    const responsePin: Pin = {
      id: updatedPin.id,
      title: updatedPin.title,
      position: [updatedPin.position_lat, updatedPin.position_lng] as [number, number],
      mainTag: updatedPin.main_tag,
      supportingTags: supportingTags.map(tag => tag.tag_name),
      content: updatedPin.content,
      createdAt: updatedPin.created_at,
      updatedAt: updatedPin.updated_at
    };
    
    return json(responsePin);
  } catch (error: unknown) {
    console.error(`Error updating pin ${params.id}:`, error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// DELETE /api/pins/[id]
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Pin ID is required' }, { status: 400 });
    }
    
    // Check if pin exists
    const existingPin = await db.getPinById(id);
    if (!existingPin) {
      return json({ error: 'Pin not found' }, { status: 404 });
    }
    
    // Delete the pin (cascade will delete supporting tags)
    await db.deletePin(id);
    
    return json({ success: true });
  } catch (error: unknown) {
    console.error(`Error deleting pin ${params.id}:`, error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};