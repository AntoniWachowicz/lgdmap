// src/hooks.server.ts
import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import initializeDatabase from '$lib/db/init';

// Initialize the database when the server starts (only in dev mode for safety)
if (dev) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialized successfully');
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
    });
}

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};