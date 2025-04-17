import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db/client';
import { generateId } from '$lib/utils';
import type { Pin, DatabasePin } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// GET /api/pins
export const GET: RequestHandler = async ({ url }) => {
  try {
    const tag = url.searchParams.get('tag');
    
    let pinsData: DatabasePin[] = [];
    if (tag) {
      pinsData = await db.getPinsByTag(tag);
    } else {
      pinsData = await db.getPins();
    }
    
    // Transform database pins to the format expected by the frontend
    const transformedPins: Pin[] = pinsData.map(pin => ({
      id: pin.id,
      title: pin.title || '',
      position: [Number(pin.position_lat) || 0, Number(pin.position_lng) || 0] as [number, number],
      mainTag: pin.main_tag || '',
      supportingTags: [], // We'll populate this in a second query
      content: Array.isArray(pin.content) ? pin.content : [],
      createdAt: pin.created_at || '',
      updatedAt: pin.updated_at || ''
    }));
    
    // Fetch supporting tags for each pin
    for (const pin of transformedPins) {
      const supportingTags = await db.query<{ tag_name: string }>(
        'SELECT tag_name FROM pin_supporting_tags WHERE pin_id = $1',
        [pin.id]
      );
      pin.supportingTags = supportingTags.map(tag => tag.tag_name || '');
    }
    
    return json(transformedPins);
  } catch (error: unknown) {
    console.error('Error fetching pins:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// POST /api/pins
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Extract position into separate lat/lng fields
    const position = data.position && Array.isArray(data.position) ? 
      data.position as [number, number] : 
      [0, 0] as [number, number];
    
    // Prepare pin data for database
    const pin = {
      id: data.id || generateId(),
      title: data.title || 'Untitled',
      position_lat: position[0],
      position_lng: position[1],
      main_tag: data.mainTag || '',
      content: Array.isArray(data.content) ? data.content : []
    };
    
    // Insert the pin
    const createdPins = await db.createPin(pin);
    
    if (!createdPins || createdPins.length === 0) {
      return json({ error: 'Failed to create pin' }, { status: 500 });
    }
    
    const createdPin = createdPins[0];
    
    // Add supporting tags
    if (data.supportingTags && Array.isArray(data.supportingTags)) {
      for (const tag of data.supportingTags) {
        await db.addPinSupportingTag(createdPin.id, tag);
      }
    }
    
    // Transform to frontend format
    const responsePin: Pin = {
      id: createdPin.id,
      title: createdPin.title,
      position: [createdPin.position_lat, createdPin.position_lng] as [number, number],
      mainTag: createdPin.main_tag,
      supportingTags: Array.isArray(data.supportingTags) ? data.supportingTags : [],
      content: createdPin.content,
      createdAt: createdPin.created_at,
      updatedAt: createdPin.updated_at
    };
    
    return json(responsePin, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating pin:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};