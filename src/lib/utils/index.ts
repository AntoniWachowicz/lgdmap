/**
 * Generate a random ID
 * @returns A random string ID
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Format a date string for display
   * @param dateStr Date string or ISO date
   * @returns Formatted date string
   */
  export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  
  /**
   * Convert camelCase to snake_case
   * @param str String in camelCase
   * @returns String in snake_case
   */
  export function camelToSnake(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
  
  /**
   * Convert snake_case to camelCase
   * @param str String in snake_case
   * @returns String in camelCase
   */
  export function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  /**
   * Transform an object's keys from camelCase to snake_case
   * @param obj Object with camelCase keys
   * @returns Object with snake_case keys
   */
  export function keysToSnakeCase<T>(obj: Record<string, any>): Record<string, any> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[camelToSnake(key)] = value;
      return acc;
    }, {} as Record<string, any>);
  }
  
  /**
   * Transform an object's keys from snake_case to camelCase
   * @param obj Object with snake_case keys
   * @returns Object with camelCase keys
   */
  export function keysToCamelCase<T>(obj: Record<string, any>): Record<string, any> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[snakeToCamel(key)] = value;
      return acc;
    }, {} as Record<string, any>);
  }
  
  /**
   * Remove undefined and null values from an object
   * @param obj Object with potential undefined/null values
   * @returns Object with only defined values
   */
  export function removeUndefined<T>(obj: Record<string, any>): Record<string, any> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  }