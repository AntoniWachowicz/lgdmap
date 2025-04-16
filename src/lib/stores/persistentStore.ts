// src/lib/stores/persistentStore.ts
import { writable, type Writable } from 'svelte/store';

type SerializeFunction<T> = (value: T) => string;
type DeserializeFunction<T> = (serialized: string) => T;

interface PersistOptions<T> {
  serialize?: SerializeFunction<T>;
  deserialize?: DeserializeFunction<T>;
}

/**
 * Creates a persistent store that saves to localStorage
 * @param key The localStorage key
 * @param initialValue The initial value
 * @param options Optional serialization options
 * @returns A writable store that persists to localStorage
 */
export function persistentWritable<T>(
  key: string, 
  initialValue: T, 
  options: PersistOptions<T> = {}
): Writable<T> {
  const serialize = options.serialize || JSON.stringify;
  const deserialize = options.deserialize || JSON.parse;
  
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Get stored value from localStorage or use initial value
  let storedValue: T;
  
  if (isBrowser) {
    try {
      const item = localStorage.getItem(key);
      storedValue = item ? deserialize(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading from localStorage`, error);
      storedValue = initialValue;
    }
  } else {
    storedValue = initialValue;
  }
  
  // Create a writable store with the stored/initial value
  const store = writable<T>(storedValue);
  
  // Subscribe to store changes and update localStorage
  if (isBrowser) {
    store.subscribe(value => {
      try {
        localStorage.setItem(key, serialize(value));
      } catch (error) {
        console.warn(`Error writing to localStorage`, error);
      }
    });
  }
  
  return store;
}