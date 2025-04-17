import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db/client';
import { generateId } from '$lib/utils';
import type { TagDefinition } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// GET /api/tags
export const GET: RequestHandler = async () => {
  try {
    const tags = await db.getTags();
    return json(tags);
  } catch (error: unknown) {
    console.error('Error fetching tags:', error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// POST /api/tags
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Prepare tag data
    const tag: TagDefinition = {
      id: data.id || generateId(),
      name: data.name || '',
      color: data.color || '#cccccc'
    };
    
    // Check if required fields are present
    if (!tag.name || !tag.color) {
      return json(
        { error: 'Name and color are required fields' }, 
        { status: 400 }
      );
    }
    
    // Create the tag
    const createdTags = await db.createTag(tag);
    
    if (!createdTags || createdTags.length === 0) {
      return json({ error: 'Failed to create tag' }, { status: 500 });
    }
    
    const createdTag = createdTags[0];
    
    return json(createdTag, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating tag:', error);
    
    // Check for duplicate key error (PostgreSQL error code 23505)
    const errorMessage = toErrorMessage(error);
    if (errorMessage.includes('23505') || errorMessage.includes('duplicate key')) {
      return json(
        { error: 'A tag with this name already exists' }, 
        { status: 409 }
      );
    }
    
    return json({ error: errorMessage }, { status: 500 });
  }
};