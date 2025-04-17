import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db/client';
import type { TagDefinition } from '$lib/types';
import { toErrorMessage } from '$lib/types';

// GET /api/tags/[id]
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Tag ID is required' }, { status: 400 });
    }
    
    // Search by ID
    const tagsResult = await db.query<TagDefinition>(
      'SELECT * FROM tags WHERE id = $1',
      [id]
    );
    
    const tag = tagsResult.length > 0 ? tagsResult[0] : null;
    
    if (!tag) {
      return json({ error: 'Tag not found' }, { status: 404 });
    }
    
    return json(tag);
  } catch (error: unknown) {
    console.error(`Error fetching tag ${params.id}:`, error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};

// PUT /api/tags/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Tag ID is required' }, { status: 400 });
    }
    
    // Get request data
    const data = await request.json();
    
    // Check if tag exists
    const existingTagsResult = await db.query<TagDefinition>(
      'SELECT * FROM tags WHERE id = $1',
      [id]
    );
    
    const existingTag = existingTagsResult.length > 0 ? existingTagsResult[0] : null;
    
    if (!existingTag) {
      return json({ error: 'Tag not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updates: Partial<TagDefinition> = {
      name: data.name !== undefined ? data.name : existingTag.name,
      color: data.color !== undefined ? data.color : existingTag.color
    };
    
    // Update the tag
    const updatedTagsResult = await db.updateTag(id, updates);
    
    if (!updatedTagsResult || updatedTagsResult.length === 0) {
      return json({ error: 'Failed to update tag' }, { status: 500 });
    }
    
    const updatedTag = updatedTagsResult[0];
    
    return json(updatedTag);
  } catch (error: unknown) {
    console.error(`Error updating tag ${params.id}:`, error);
    
    // Check for duplicate key error
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

// DELETE /api/tags/[id]
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Tag ID is required' }, { status: 400 });
    }
    
    // Check if tag exists
    const existingTagsResult = await db.query<TagDefinition>(
      'SELECT * FROM tags WHERE id = $1',
      [id]
    );
    
    const existingTag = existingTagsResult.length > 0 ? existingTagsResult[0] : null;
    
    if (!existingTag) {
      return json({ error: 'Tag not found' }, { status: 404 });
    }
    
    // Check if tag is in use by any pins
    const pinWithTagResult = await db.query<{ id: string }>(
      'SELECT id FROM pins WHERE main_tag = $1 LIMIT 1',
      [existingTag.name]
    );
    
    const pinWithTag = pinWithTagResult.length > 0 ? pinWithTagResult[0] : null;
    
    if (pinWithTag) {
      return json(
        { error: 'Cannot delete tag that is used as a main tag by pins' }, 
        { status: 400 }
      );
    }
    
    // Check if tag is used as a supporting tag
    const supportingTagUseResult = await db.query<{ pin_id: string }>(
      'SELECT pin_id FROM pin_supporting_tags WHERE tag_name = $1 LIMIT 1',
      [existingTag.name]
    );
    
    const supportingTagUse = supportingTagUseResult.length > 0 ? supportingTagUseResult[0] : null;
    
    if (supportingTagUse) {
      return json(
        { error: 'Cannot delete tag that is used as a supporting tag by pins' }, 
        { status: 400 }
      );
    }
    
    // Delete the tag
    await db.deleteTag(id);
    
    return json({ success: true });
  } catch (error: unknown) {
    console.error(`Error deleting tag ${params.id}:`, error);
    return json({ error: toErrorMessage(error) }, { status: 500 });
  }
};