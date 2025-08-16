/**
 * URL Utility Functions
 * 
 * This module provides utility functions for URL construction and parameter handling
 */

/**
 * Constructs a URL from a template by replacing parameter placeholders with actual values
 * 
 * @param templateUrl - URL template with placeholders like {param}
 * @param params - Object containing parameter key-value pairs
 * @returns The constructed URL with parameters replaced
 * 
 * @example
 * constructUrl('https://api.example.com/user/{id}', { id: '123' })
 * // Returns: 'https://api.example.com/user/123'
 */
export const constructUrl = (templateUrl: string, params: Record<string, string>): string => {
  let constructedUrl = templateUrl;
  Object.entries(params).forEach(([key, value]) => {
    constructedUrl = constructedUrl.replace(`{${key}}`, encodeURIComponent(value));
  });
  return constructedUrl;
};

/**
 * Validates if a string is a valid URL
 * 
 * @param url - String to validate
 * @returns True if valid URL, false otherwise
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extracts base domain from a URL
 * 
 * @param url - Full URL string
 * @returns Base domain or empty string if invalid
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
};

/**
 * Builds query string from parameters object
 * 
 * @param params - Object containing query parameters
 * @returns Query string (without leading ?)
 */
export const buildQueryString = (params: Record<string, string>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  return searchParams.toString();
};