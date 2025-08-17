/**
 * Date Utility Functions
 * 
 * This module provides utility functions for date formatting and manipulation
 */

/**
 * Formats a date string or Date object to a readable format
 * 
 * @param date - Date string, Date object, or null/undefined
 * @param format - Format type ('short', 'long', 'iso')
 * @returns Formatted date string or "Not available" if invalid
 */
export const formatDate = (
  date: string | Date | null | undefined,
  format: 'short' | 'long' | 'iso' = 'short'
): string => {
  if (!date) return "Not available";
  
  try {
    // Handle DD-MM-YYYY format specifically
    if (typeof date === 'string' && date.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = date.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (isNaN(dateObj.getTime())) {
        return "Not available";
      }
      
      switch (format) {
        case 'short':
          return dateObj.toLocaleDateString('en-US');
        case 'long':
          return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        case 'iso':
          return dateObj.toISOString();
        default:
          return dateObj.toLocaleDateString('en-US');
      }
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return "Not available";
    }
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-US');
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'iso':
        return dateObj.toISOString();
      default:
        return dateObj.toLocaleDateString('en-US');
    }
  } catch {
    return "Not available";
  }
};

/**
 * Gets current timestamp in ISO format
 * 
 * @returns ISO timestamp string
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Calculates age from birth date
 * 
 * @param birthDate - Birth date string or Date object
 * @returns Age in years or null if invalid
 */
export const calculateAge = (birthDate: string | Date | null | undefined): number | null => {
  if (!birthDate) return null;
  
  try {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    if (isNaN(birth.getTime())) return null;
    
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    
    return age;
  } catch {
    return null;
  }
};