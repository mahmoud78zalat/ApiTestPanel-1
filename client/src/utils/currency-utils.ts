/**
 * Currency Utility Functions
 * 
 * This module provides utility functions for currency detection and formatting
 */

/**
 * Extracts the actual currency from order data
 * 
 * @param orders - Array of order objects
 * @returns Currency symbol with appropriate spacing
 * 
 * @example
 * getActualCurrency([{ currencyCode: "AED" }]) // Returns "AED "
 * getActualCurrency([{ currency: "USD" }]) // Returns "USD "
 */
export const getActualCurrency = (orders: any[]): string => {
  if (!orders || orders.length === 0) return "$";
  
  // Get currency from first order
  const firstOrder = orders[0];
  
  if (firstOrder.currencyCode) {
    return firstOrder.currencyCode === "AED" ? "AED " : firstOrder.currencyCode + " ";
  }
  
  if (firstOrder.currency) {
    return firstOrder.currency === "AED" ? "AED " : firstOrder.currency + " ";
  }
  
  if (firstOrder.transactionAmount && firstOrder.transactionAmount.includes("AED")) {
    return "AED ";
  }
  
  return "$"; // Fallback
};

/**
 * Formats a monetary amount with currency symbol
 * 
 * @param amount - Numeric amount
 * @param currencySymbol - Currency symbol to prepend
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, "AED ") // Returns "AED 1,234.56"
 */
export const formatCurrency = (amount: number, currencySymbol: string = "$"): string => {
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${currencySymbol}${formattedAmount}`;
};

/**
 * Parses a currency string to extract numeric value
 * 
 * @param currencyString - String containing currency amount
 * @returns Numeric value or 0 if parsing fails
 */
export const parseCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;
  
  // Remove currency symbols and spaces, keep numbers and decimal points
  const numericString = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(numericString);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Normalizes country names to avoid duplicates
 * 
 * @param country - Country name to normalize
 * @returns Normalized country name
 */
export const normalizeCountryName = (country: string): string => {
  if (!country) return 'Unknown';
  
  const normalized = country.toLowerCase().trim();
  
  // Handle UAE variations
  if (normalized.includes('uae') || normalized.includes('united arab emirates') || normalized.includes('emirates')) {
    return 'United Arab Emirates';
  }
  
  // Handle UK variations
  if (normalized.includes('uk') || normalized.includes('united kingdom') || normalized.includes('britain')) {
    return 'United Kingdom';
  }
  
  // Handle USA variations
  if (normalized.includes('usa') || normalized.includes('united states') || normalized.includes('america')) {
    return 'United States';
  }
  
  // Handle KSA variations
  if (normalized.includes('ksa') || normalized.includes('saudi') || normalized.includes('kingdom of saudi')) {
    return 'Saudi Arabia';
  }
  
  // Return properly capitalized version
  return country.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/**
 * Determines country based on currency from orders
 * 
 * @param orders - Array of order objects
 * @returns Country string based on currency detection
 */
export const getCountryFromCurrency = (orders: any[]): string => {
  if (!orders || orders.length === 0) return 'Unknown';
  
  const currency = getActualCurrency(orders);
  
  // Map currencies to countries (normalize UAE naming)
  if (currency.includes('AED')) {
    return 'United Arab Emirates';
  } else if (currency.includes('USD') || currency === '$') {
    return 'Lebanon';
  } else if (currency.includes('EUR') || currency === '€') {
    return 'Europe';
  } else if (currency.includes('GBP') || currency === '£') {
    return 'United Kingdom';
  } else if (currency.includes('SAR')) {
    return 'Saudi Arabia';
  } else if (currency.includes('QAR')) {
    return 'Qatar';
  } else if (currency.includes('KWD')) {
    return 'Kuwait';
  } else if (currency.includes('BHD')) {
    return 'Bahrain';
  } else if (currency.includes('OMR')) {
    return 'Oman';
  } else if (currency.includes('LBP') || currency.includes('LL')) {
    return 'Lebanon';
  } else if (currency.includes('EGP')) {
    return 'Egypt';
  } else if (currency.includes('JOD')) {
    return 'Jordan';
  } else if (currency.includes('SYP')) {
    return 'Syria';
  } else if (currency.includes('IQD')) {
    return 'Iraq';
  } else if (currency.includes('TRY')) {
    return 'Turkey';
  }
  
  return 'Unknown';
};