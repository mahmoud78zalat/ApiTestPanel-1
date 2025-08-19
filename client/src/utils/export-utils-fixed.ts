/**
 * Export Utility Functions - Complete Fix with Fallback Address Logic
 * 
 * This module provides utilities for exporting customer profile data to various formats
 * with proper order amount, status, payment field, and address handling with shipping fallbacks
 */

import type { CustomerProfile } from "@shared/schema";
import { formatDate } from "./date-utils";
import { formatCurrency, getActualCurrency, getCountryFromCurrency, normalizeCountryName, getShippingAddressFromOrders } from "./currency-utils";
import { categorizeProfiles, getIncompleteReasons } from "./profile-validation";

/**
 * Export formats supported by the application
 */
export type ExportFormat = 'csv' | 'txt';

/**
 * Helper function to extract city from address string, filtering out store/shop details
 */
const extractCityFromAddress = (address: string): string => {
  if (!address) return '';
  
  // Common patterns to identify city names in UAE addresses
  const cityPatterns = [
    /(?:city:\s*)?([A-Za-z\s]+)(?:,\s*(?:country|state|area))/i,
    /(?:^|,\s*)([A-Za-z\s]+)\s*(?:,\s*(?:uae|united arab emirates|emirates))/i,
    /(?:^|,\s*)(Dubai|Abu Dhabi|Sharjah|Ajman|Ras Al Khaimah|Fujairah|Umm Al Quwain|Al Ain)(?:\s|,|$)/i
  ];
  
  for (const pattern of cityPatterns) {
    const match = address.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // If no specific pattern found, try to extract the last meaningful location before country
  const parts = address.split(',').map(p => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Skip country names and common store indicators
    if (!part.toLowerCase().includes('united arab emirates') && 
        !part.toLowerCase().includes('emirates') &&
        !part.toLowerCase().includes('showroom') &&
        !part.toLowerCase().includes('shop') &&
        !part.toLowerCase().includes('store') &&
        !part.toLowerCase().includes('mall') &&
        !part.toLowerCase().includes('center') &&
        !part.toLowerCase().includes('centre') &&
        !part.toLowerCase().includes('boulevard') &&
        part.length > 2 && part.length < 30) {
      return part;
    }
  }
  
  return '';
};

/**
 * Helper function to get fallback address from shipping data in orders (city and country only)
 */
const getFallbackAddressFromOrders = (orders: any[]): { address: string; city: string; country: string; type: string } | null => {
  if (!orders?.length) return null;
  
  // Look for shipping address in latest orders
  for (const order of orders.slice(0, 3)) {
    let shippingAddress = '';
    let shippingCity = '';
    let shippingCountry = '';
    
    // Check enriched data first (priority 1)
    if (order?.enrichedData?.shippingAddress) {
      shippingAddress = order.enrichedData.shippingAddress;
      shippingCity = order.enrichedData.shippingState || order.enrichedData.shippingArea || '';
      shippingCountry = order.enrichedData.shippingCountry || 'United Arab Emirates';
    }
    // Fallback to direct order properties (priority 2)
    else if (order?.shippingAddress) {
      shippingAddress = order.shippingAddress;
      shippingCity = order.shippingState || order.shippingArea || '';
      shippingCountry = order.shippingCountry || 'United Arab Emirates';
    }
    
    if (shippingAddress) {
      // Extract city from the full address if not provided separately
      if (!shippingCity) {
        shippingCity = extractCityFromAddress(shippingAddress);
      }
      
      // Only return city and country, not the full address
      if (shippingCity || shippingCountry) {
        return {
          address: '', // Don't include full address
          city: shippingCity || 'Unknown City',
          country: shippingCountry,
          type: 'shipping_fallback'
        };
      }
    }
  }
  
  return null;
};

/**
 * Helper function to extract order amount from various fields
 */
const extractOrderAmount = (order: any): number => {
  // Try transactionAmount first (most reliable)
  if (order.transactionAmount) {
    if (typeof order.transactionAmount === 'string') {
      const matches = order.transactionAmount.match(/[\d.]+/);
      if (matches) {
        return parseFloat(matches[0]);
      }
    } else if (typeof order.transactionAmount === 'number') {
      return order.transactionAmount;
    }
  }
  
  // Fallback to other amount fields
  if (order.totalAmount && !isNaN(parseFloat(order.totalAmount))) {
    return parseFloat(order.totalAmount);
  }
  
  if (order.amount && !isNaN(parseFloat(order.amount))) {
    return parseFloat(order.amount);
  }
  
  return 0;
};

/**
 * Helper function to extract order status from various fields
 */
const extractOrderStatus = (order: any): string => {
  return order.shipStatus || 
         order.orderStatus || 
         order.status || 
         order.deliveryStatus || 
         'Unknown';
};

/**
 * Helper function to extract payment method from various fields
 */
const extractPaymentMethod = (order: any): string => {
  return order.paymentGateway ||
         order.paymentMethod ||
         order.gateway ||
         order.payment ||
         'Unknown';
};

/**
 * Helper function to extract address line from address object
 */
const extractAddressLine = (addr: any): string => {
  return addr.address || addr.addressLine1 || addr.street || addr.line1 || 'Address not available';
};

/**
 * Helper function to extract city from address object
 */
const extractCity = (addr: any): string => {
  return addr.city || addr.town || addr.locality || 'Unknown';
};

/**
 * Helper function to extract country from address object
 */
const extractCountry = (addr: any): string => {
  return normalizeCountryName(addr.country || addr.countryName || addr.countryCode || 'Unknown');
};

/**
 * Get address information with fallback logic
 */
const getAddressInfo = (profile: CustomerProfile) => {
  if (profile.addresses && profile.addresses.length > 0) {
    const addr = profile.addresses[0];
    return {
      address: extractAddressLine(addr),
      city: extractCity(addr),
      country: extractCountry(addr),
      type: 'stored'
    };
  } else {
    // Check for fallback address from shipping data
    const fallbackAddress = getFallbackAddressFromOrders(profile.latestOrders || []);
    if (fallbackAddress) {
      return fallbackAddress;
    }
  }
  
  return {
    address: 'None saved',
    city: 'Unknown',
    country: 'Unknown',
    type: 'none'
  };
};

/**
 * Exports customer profile data to CSV format with improved address handling
 */
export const exportToCSV = (profiles: CustomerProfile[]): string => {
  if (profiles.length === 0) return '';

  // CSV Headers including payment information
  const headers = [
    'Customer ID',
    'Full Name',
    'Email',
    'Phone Number',
    'Birthday',
    'Gender',
    'Registration Date',
    'Total Orders',
    'Total Purchase Amount',
    'Address Count',
    'Primary Address',
    'Primary City',
    'Primary Country',
    'Address Type',
    'Profile Status',
    'Missing Fields',
    'Order 1 ID',
    'Order 1 Date',
    'Order 1 Amount',
    'Order 1 Status',
    'Order 1 Payment',
    'Order 1 Invoice URL',
    'Order 2 ID',
    'Order 2 Date', 
    'Order 2 Amount',
    'Order 2 Status',
    'Order 2 Payment',
    'Order 2 Invoice URL',
    'Order 3 ID',
    'Order 3 Date',
    'Order 3 Amount',
    'Order 3 Status', 
    'Order 3 Payment',
    'Order 3 Invoice URL'
  ];

  // Categorize profiles into complete and incomplete
  const { complete, incomplete } = categorizeProfiles(profiles);

  // Group profiles by country with improved country detection
  const groupProfilesByCountry = (profileList: CustomerProfile[]) => {
    return profileList.reduce((acc, profile) => {
      // First try to get country from address with fallback
      const addressInfo = getAddressInfo(profile);
      let country = addressInfo.country;
      
      // If no address country, try to determine from currency
      if (!country || country === 'Unknown') {
        country = getCountryFromCurrency(profile.latestOrders || []);
      }
      
      // Fallback to 'Unknown' if still not found
      if (!country) country = 'Unknown';
      
      if (!acc[country]) acc[country] = [];
      acc[country].push(profile);
      return acc;
    }, {} as Record<string, CustomerProfile[]>);
  };

  const completeProfilesByCountry = groupProfilesByCountry(complete);
  const incompleteProfilesByCountry = groupProfilesByCountry(incomplete);

  // Get all countries and sort by total customer count
  const allCountries = new Set([
    ...Object.keys(completeProfilesByCountry),
    ...Object.keys(incompleteProfilesByCountry)
  ]);

  const sortedCountries = Array.from(allCountries).sort((a, b) => {
    const aTotal = (completeProfilesByCountry[a]?.length || 0) + (incompleteProfilesByCountry[a]?.length || 0);
    const bTotal = (completeProfilesByCountry[b]?.length || 0) + (incompleteProfilesByCountry[b]?.length || 0);
    return bTotal - aTotal;
  });

  // Generate CSV content
  let csvContent = headers.join(',') + '\n';

  for (const country of sortedCountries) {
    const countryProfiles = [
      ...(completeProfilesByCountry[country] || []),
      ...(incompleteProfilesByCountry[country] || [])
    ];

    for (const profile of countryProfiles) {
      const currency = getActualCurrency(profile.latestOrders);
      const addressInfo = getAddressInfo(profile);
      const missingFields = getIncompleteReasons(profile);
      const profileStatus = missingFields.length === 0 ? 'Complete' : 'Incomplete';

      const row = [
        profile.customerId || '',
        profile.fullName || '',
        profile.email || '',
        profile.phoneNumber || '',
        formatDate(profile.birthDate),
        profile.gender || '',
        formatDate(profile.registerDate),
        profile.totalOrdersCount || 0,
        formatCurrency(profile.totalPurchasesAmount, currency),
        profile.addresses?.length || 0,
        addressInfo.type === 'shipping_fallback' ? `${addressInfo.city} (Approximate from latest order)` : addressInfo.address,
        addressInfo.city,
        addressInfo.country,
        addressInfo.type === 'shipping_fallback' ? 'Shipping Fallback' : addressInfo.type === 'stored' ? 'Stored' : 'None',
        profileStatus,
        missingFields.join('; '),
        // Order details (up to 3 orders)
        ...(Array(3).fill(null).flatMap((_, orderIndex) => {
          const order = profile.latestOrders?.[orderIndex];
          return order ? [
            order.orderId || '',
            formatDate(order.orderDate || order.createDate),
            formatCurrency(extractOrderAmount(order), currency),
            extractOrderStatus(order),
            extractPaymentMethod(order),
            order.invoiceUrl || ''
          ] : Array(6).fill('')
        }))
      ];

      csvContent += row.join(',') + '\n';
    }
  }

  return csvContent;
};

/**
 * Exports customer profile data to TXT format with improved address handling
 */
export const exportToTXT = (profiles: CustomerProfile[]): string => {
  if (profiles.length === 0) return 'No customer profiles to export.';

  // Categorize profiles into complete and incomplete
  const { complete, incomplete } = categorizeProfiles(profiles);

  let content = `CUSTOMER PROFILE EXPORT REPORT\n`;
  content += `Generated: ${new Date().toLocaleString()}\n`;
  content += `Total Profiles: ${profiles.length}\n`;
  content += `Complete Profiles: ${complete.length}\n`;
  content += `Incomplete Profiles: ${incomplete.length}\n`;
  content += `${'='.repeat(80)}\n\n`;

  // Group profiles by country with improved country detection
  const groupProfilesByCountry = (profileList: CustomerProfile[]) => {
    return profileList.reduce((acc, profile) => {
      // First try to get country from address with fallback
      const addressInfo = getAddressInfo(profile);
      let country = addressInfo.country;
      
      // If no address country, try to determine from currency
      if (!country || country === 'Unknown') {
        country = getCountryFromCurrency(profile.latestOrders || []);
      }
      
      // Fallback to 'Unknown' if still not found
      if (!country) country = 'Unknown';
      
      if (!acc[country]) acc[country] = [];
      acc[country].push(profile);
      return acc;
    }, {} as Record<string, CustomerProfile[]>);
  };

  const completeProfilesByCountry = groupProfilesByCountry(complete);
  const incompleteProfilesByCountry = groupProfilesByCountry(incomplete);

  // Get all countries and sort by total customer count
  const allCountries = new Set([
    ...Object.keys(completeProfilesByCountry),
    ...Object.keys(incompleteProfilesByCountry)
  ]);

  const sortedCountries = Array.from(allCountries).sort((a, b) => {
    const aTotal = (completeProfilesByCountry[a]?.length || 0) + (incompleteProfilesByCountry[a]?.length || 0);
    const bTotal = (completeProfilesByCountry[b]?.length || 0) + (incompleteProfilesByCountry[b]?.length || 0);
    return bTotal - aTotal;
  });

  for (const country of sortedCountries) {
    const completeCount = completeProfilesByCountry[country]?.length || 0;
    const incompleteCount = incompleteProfilesByCountry[country]?.length || 0;
    const totalCount = completeCount + incompleteCount;

    content += `COUNTRY: ${country} (${totalCount} customers - ${completeCount} complete, ${incompleteCount} incomplete)\n`;
    content += `${'-'.repeat(80)}\n\n`;

    // First add complete profiles
    const countryCompleteProfiles = completeProfilesByCountry[country] || [];
    const sortedCompleteProfiles = countryCompleteProfiles.sort((a, b) => 
      (b.totalPurchasesAmount || 0) - (a.totalPurchasesAmount || 0)
    );

    if (sortedCompleteProfiles.length > 0) {
      content += `COMPLETE PROFILES (${sortedCompleteProfiles.length}):\n`;
      content += `${'-'.repeat(40)}\n\n`;

      for (const profile of sortedCompleteProfiles) {
        const currency = getActualCurrency(profile.latestOrders);
        const addressInfo = getAddressInfo(profile);
        
        content += `Customer ID: ${profile.customerId}\n`;
        content += `Full Name: ${profile.fullName}\n`;
        
        content += `\nPERSONAL INFO:\n`;
        content += `  Email: ${profile.email || 'Not available'}\n`;
        content += `  Phone: ${profile.phoneNumber || 'Not available'}\n`;
        content += `  Birthday: ${formatDate(profile.birthDate)}\n`;
        content += `  Gender: ${profile.gender || 'Not available'}\n`;
        content += `  Registration Date: ${formatDate(profile.registerDate)}\n`;
        
        content += `\nORDER SUMMARY:\n`;
        content += `  Total Orders: ${profile.totalOrdersCount || 0}\n`;
        content += `  Total Purchase Amount: ${formatCurrency(profile.totalPurchasesAmount, currency)}\n`;
        
        // GUARANTEED FIX: Display ALL addresses instead of just the first one
        if (profile.addresses && profile.addresses.length > 0) {
          content += `\nADDRESSES (${profile.addresses.length}):\n`;
          
          // Loop through ALL addresses in the array
          for (let idx = 0; idx < profile.addresses.length; idx++) {
            content += `  ${idx + 1}. `;
            
            const addr = profile.addresses[idx];
            
            // Check if address is null/undefined/empty
            if (!addr || addr === null || addr === undefined) {
              content += `[Address slot ${idx + 1} is empty]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            if (typeof addr === 'object' && Object.keys(addr).length === 0) {
              content += `[Address slot ${idx + 1} is empty object]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            // Extract address fields with comprehensive checking
            const addressLine = addr.address || 
                               addr.addressLine1 || 
                               addr.addressLine || 
                               addr.street || 
                               addr.fullAddress || 
                               addr.streetAddress || 
                               '[No address specified]';
                               
            const city = addr.city || 
                        addr.cityName || 
                        addr.town || 
                        addr.locality || 
                        addr.area || 
                        'Unknown';
                        
            const country = addr.country || 
                           addr.countryName || 
                           addr.countryCode || 
                           'United Arab Emirates';
            
            // Display the address
            content += `${addressLine}\n`;
            content += `     City: ${city}, Country: ${country}\n`;
            
            // Add optional fields
            if (addr.area && typeof addr.area === 'string' && addr.area.trim()) {
              content += `     Area: ${addr.area}\n`;
            }
            if (addr.zipcode || addr.zipCode || addr.postalCode) {
              const zip = addr.zipcode || addr.zipCode || addr.postalCode;
              content += `     Zip: ${zip}\n`;
            }
            if (addr.state && typeof addr.state === 'string' && addr.state.trim()) {
              content += `     State: ${addr.state}\n`;
            }
            
            content += `\n`;
          }
        } else if (addressInfo.type === 'shipping_fallback') {
          content += `\nADDRESSES (1 - Approximate from latest order):\n`;
          content += `  1. ${addressInfo.city} (Approximate from latest order)\n`;
          content += `     City: ${addressInfo.city}, Country: ${addressInfo.country}\n`;
        } else {
          content += `\nADDRESSES: None saved\n`;
        }
        
        if (profile.latestOrders && profile.latestOrders.length > 0) {
          content += `\nRECENT ORDERS (${Math.min(profile.latestOrders.length, 5)}):\n`;
          profile.latestOrders.slice(0, 5).forEach((order: any, idx) => {
            const orderAmount = extractOrderAmount(order);
            const orderStatus = extractOrderStatus(order);
            const paymentMethod = extractPaymentMethod(order);
            
            content += `  ${idx + 1}. Order ${order.orderId || 'Unknown'}\n`;
            content += `     Date: ${formatDate(order.orderDate || order.createDate)}\n`;
            content += `     Amount: ${formatCurrency(orderAmount, currency)}\n`;
            content += `     Status: ${orderStatus}\n`;
            content += `     Payment: ${paymentMethod}\n`;
            if (order.invoiceUrl) {
              content += `     Invoice: ${order.invoiceUrl}\n`;
            }
          });
        } else {
          content += `\nRECENT ORDERS: None available\n`;
        }
        
        content += `\n${'-'.repeat(40)}\n\n`;
      }
    }

    // Then add incomplete profiles for this country
    const countryIncompleteProfiles = incompleteProfilesByCountry[country] || [];
    const sortedIncompleteProfiles = countryIncompleteProfiles.sort((a, b) => 
      (b.totalPurchasesAmount || 0) - (a.totalPurchasesAmount || 0)
    );

    if (sortedIncompleteProfiles.length > 0) {
      content += `INCOMPLETE PROFILES (${sortedIncompleteProfiles.length}):\n`;
      content += `${'-'.repeat(40)}\n\n`;

      for (const profile of sortedIncompleteProfiles) {
        const currency = getActualCurrency(profile.latestOrders);
        const incompleteReasons = getIncompleteReasons(profile);
        const addressInfo = getAddressInfo(profile);
        
        content += `Customer ID: ${profile.customerId}\n`;
        content += `Full Name: ${profile.fullName}\n`;
        content += `Missing Information: ${incompleteReasons.join(', ')}\n`;
        
        content += `\nPERSONAL INFO:\n`;
        content += `  Email: ${profile.email || 'Not available'}\n`;
        content += `  Phone: ${profile.phoneNumber || 'Not available'}\n`;
        content += `  Birthday: ${formatDate(profile.birthDate)}\n`;
        content += `  Gender: ${profile.gender || 'Not available'}\n`;
        content += `  Registration Date: ${formatDate(profile.registerDate)}\n`;
        
        content += `\nORDER SUMMARY:\n`;
        content += `  Total Orders: ${profile.totalOrdersCount || 0}\n`;
        content += `  Total Purchase Amount: ${formatCurrency(profile.totalPurchasesAmount, currency)}\n`;
        
        // GUARANTEED FIX: Display ALL addresses instead of just the first one
        if (profile.addresses && profile.addresses.length > 0) {
          content += `\nADDRESSES (${profile.addresses.length}):\n`;
          
          // Loop through ALL addresses in the array
          for (let idx = 0; idx < profile.addresses.length; idx++) {
            content += `  ${idx + 1}. `;
            
            const addr = profile.addresses[idx];
            
            // Check if address is null/undefined/empty
            if (!addr || addr === null || addr === undefined) {
              content += `[Address slot ${idx + 1} is empty]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            if (typeof addr === 'object' && Object.keys(addr).length === 0) {
              content += `[Address slot ${idx + 1} is empty object]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            // Extract address fields with comprehensive checking
            const addressLine = addr.address || 
                               addr.addressLine1 || 
                               addr.addressLine || 
                               addr.street || 
                               addr.fullAddress || 
                               addr.streetAddress || 
                               '[No address specified]';
                               
            const city = addr.city || 
                        addr.cityName || 
                        addr.town || 
                        addr.locality || 
                        addr.area || 
                        'Unknown';
                        
            const country = addr.country || 
                           addr.countryName || 
                           addr.countryCode || 
                           'United Arab Emirates';
            
            // Display the address
            content += `${addressLine}\n`;
            content += `     City: ${city}, Country: ${country}\n`;
            
            // Add optional fields
            if (addr.area && typeof addr.area === 'string' && addr.area.trim()) {
              content += `     Area: ${addr.area}\n`;
            }
            if (addr.zipcode || addr.zipCode || addr.postalCode) {
              const zip = addr.zipcode || addr.zipCode || addr.postalCode;
              content += `     Zip: ${zip}\n`;
            }
            if (addr.state && typeof addr.state === 'string' && addr.state.trim()) {
              content += `     State: ${addr.state}\n`;
            }
            
            content += `\n`;
          }
        } else if (addressInfo.type === 'shipping_fallback') {
          content += `\nADDRESSES (1 - Approximate from latest order):\n`;
          content += `  1. ${addressInfo.city} (Approximate from latest order)\n`;
          content += `     City: ${addressInfo.city}, Country: ${addressInfo.country}\n`;
        } else {
          content += `\nADDRESSES: None saved\n`;
        }
        
        if (profile.latestOrders && profile.latestOrders.length > 0) {
          content += `\nRECENT ORDERS (${Math.min(profile.latestOrders.length, 5)}):\n`;
          profile.latestOrders.slice(0, 5).forEach((order: any, idx) => {
            const orderAmount = extractOrderAmount(order);
            const orderStatus = extractOrderStatus(order);
            const paymentMethod = extractPaymentMethod(order);
            
            content += `  ${idx + 1}. Order ${order.orderId || 'Unknown'}\n`;
            content += `     Date: ${formatDate(order.orderDate || order.createDate)}\n`;
            content += `     Amount: ${formatCurrency(orderAmount, currency)}\n`;
            content += `     Status: ${orderStatus}\n`;
            content += `     Payment: ${paymentMethod}\n`;
            if (order.invoiceUrl) {
              content += `     Invoice: ${order.invoiceUrl}\n`;
            }
          });
        } else {
          content += `\nRECENT ORDERS: None available\n`;
        }
        
        content += `\n${'-'.repeat(40)}\n\n`;
      }
    }
  }

  return content;
};

/**
 * Triggers download of content as a file
 * 
 * @param content - File content to download
 * @param filename - Name of the file
 * @param mimeType - MIME type of the file
 */
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};