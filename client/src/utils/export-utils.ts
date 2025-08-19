/**
 * Export Utility Functions - Complete Fix
 * 
 * This module provides utilities for exporting customer profile data to various formats
 * with proper order amount, status, payment field, and address handling
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
 * Helper function to get fallback address from shipping data in orders
 */
const getFallbackAddressFromOrders = (orders: any[]): { address: string; city: string; country: string; type: string } | null => {
  if (!orders?.length) return null;
  
  // Look for shipping address in latest orders
  for (const order of orders.slice(0, 3)) {
    // Check enriched data first (priority 1)
    if (order?.enrichedData?.shippingAddress) {
      return {
        address: order.enrichedData.shippingAddress,
        city: order.enrichedData.shippingState || order.enrichedData.shippingArea || '',
        country: order.enrichedData.shippingCountry || 'United Arab Emirates',
        type: 'shipping_fallback'
      };
    }
    // Fallback to direct order properties (priority 2)
    else if (order?.shippingAddress) {
      return {
        address: order.shippingAddress,
        city: order.shippingState || order.shippingArea || '',
        country: order.shippingCountry || 'United Arab Emirates',
        type: 'shipping_fallback'
      };
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
 * Helper function to extract payment method from order
 */
const extractPaymentMethod = (order: any): string => {
  return order.paymentMethod || 
         order.payment || 
         order.paymentType || 
         order.method ||
         order.paymentExtraInfo ||
         order.paymentGateWay ||
         'Not available';
};

/**
 * Helper function to extract address line from address object
 */
const extractAddressLine = (addr: any): string => {
  if (!addr) return 'No address data';
  
  const addressLine = addr.addressLine1 || 
                     addr.address || 
                     addr.fullAddress || 
                     addr.street ||
                     addr.streetAddress ||
                     addr.addressLine ||
                     '';
  
  return addressLine || 'No address specified';
};

/**
 * Helper function to extract city from address object
 */
const extractCity = (addr: any): string => {
  if (!addr) return 'Unknown';
  
  return addr.city || 
         addr.cityName || 
         addr.area ||
         'Unknown';
};

/**
 * Helper function to extract country from address object
 */
const extractCountry = (addr: any): string => {
  if (!addr) return 'Unknown';
  
  return addr.country || 
         addr.countryName || 
         'United Arab Emirates'; // Default to UAE as fallback
};

/**
 * Exports customer profiles to CSV format
 * 
 * @param profiles - Array of customer profiles to export
 * @returns CSV content as string
 */
export const exportToCSV = (profiles: CustomerProfile[]): string => {
  if (profiles.length === 0) return '';

  // CSV Headers including all addresses
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
    'All Addresses',
    'Primary City',
    'Primary Country',
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
      // First try to get country from address
      let country = profile.addresses?.[0] ? extractCountry(profile.addresses[0]) : undefined;
      
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

  // Generate CSV rows
  let csvContent = headers.join(',') + '\n';

  for (const country of sortedCountries) {
    // First add complete profiles for this country
    const countryCompleteProfiles = completeProfilesByCountry[country] || [];
    const sortedCompleteProfiles = countryCompleteProfiles
      .sort((a, b) => (b.totalPurchasesAmount || 0) - (a.totalPurchasesAmount || 0));
    
    for (const profile of sortedCompleteProfiles) {
      const currency = getActualCurrency(profile.latestOrders);
      const primaryAddress = profile.addresses?.[0];
      const shippingAddressFallback = !primaryAddress ? getShippingAddressFromOrders(profile.latestOrders || []) : '';
      const incompleteReasons = getIncompleteReasons(profile);
      
      // Format all addresses as a single string
      const allAddresses = profile.addresses && profile.addresses.length > 0 
        ? profile.addresses.map((addr, idx) => {
            const addressLine = extractAddressLine(addr);
            const city = extractCity(addr);
            const country = extractCountry(addr);
            return `${idx + 1}. ${addressLine}, ${city}, ${country}`;
          }).join(' | ')
        : shippingAddressFallback || 'No addresses';

      const row = [
        profile.customerId,
        `"${profile.fullName}"`,
        profile.email || '',
        profile.phoneNumber || '',
        formatDate(profile.birthDate),
        profile.gender || '',
        formatDate(profile.registerDate),
        profile.totalOrdersCount?.toString() || '0',
        formatCurrency(profile.totalPurchasesAmount, currency),
        profile.addresses?.length?.toString() || '0',
        `"${allAddresses}"`,
        primaryAddress ? extractCity(primaryAddress) : '',
        primaryAddress ? extractCountry(primaryAddress) : country,
        'Complete',
        '',
        // First 3 orders with proper field extraction
        ...(profile.latestOrders?.slice(0, 3).flatMap((order: any) => [
          order.orderId || '',
          formatDate(order.orderDate || order.createDate),
          formatCurrency(extractOrderAmount(order), currency),
          extractOrderStatus(order),
          extractPaymentMethod(order),
          order.invoiceUrl || ''
        ]) || Array(18).fill(''))
      ];

      csvContent += row.join(',') + '\n';
    }

    // Then add incomplete profiles for this country
    const countryIncompleteProfiles = incompleteProfilesByCountry[country] || [];
    const sortedIncompleteProfiles = countryIncompleteProfiles
      .sort((a, b) => (b.totalPurchasesAmount || 0) - (a.totalPurchasesAmount || 0));
    
    for (const profile of sortedIncompleteProfiles) {
      const currency = getActualCurrency(profile.latestOrders);
      const primaryAddress = profile.addresses?.[0];
      const shippingAddressFallback = !primaryAddress ? getShippingAddressFromOrders(profile.latestOrders || []) : '';
      const incompleteReasons = getIncompleteReasons(profile);
      
      // Format all addresses as a single string for incomplete profiles too
      const allAddressesIncomplete = profile.addresses && profile.addresses.length > 0 
        ? profile.addresses.map((addr, idx) => {
            const addressLine = extractAddressLine(addr);
            const city = extractCity(addr);
            const country = extractCountry(addr);
            return `${idx + 1}. ${addressLine}, ${city}, ${country}`;
          }).join(' | ')
        : shippingAddressFallback || 'No addresses';

      const row = [
        profile.customerId,
        `"${profile.fullName}"`,
        profile.email || '',
        profile.phoneNumber || '',
        formatDate(profile.birthDate),
        profile.gender || '',
        formatDate(profile.registerDate),
        profile.totalOrdersCount?.toString() || '0',
        formatCurrency(profile.totalPurchasesAmount, currency),
        profile.addresses?.length?.toString() || '0',
        `"${allAddressesIncomplete}"`,
        primaryAddress ? extractCity(primaryAddress) : '',
        primaryAddress ? extractCountry(primaryAddress) : country,
        'Incomplete',
        `"${incompleteReasons.join('; ')}"`,
        // First 3 orders with proper field extraction for incomplete profiles
        ...(profile.latestOrders?.slice(0, 3).flatMap((order: any) => [
          order.orderId || '',
          formatDate(order.orderDate || order.createDate),
          formatCurrency(extractOrderAmount(order), currency),
          extractOrderStatus(order),
          extractPaymentMethod(order),
          order.invoiceUrl || ''
        ]) || Array(18).fill(''))
      ];

      csvContent += row.join(',') + '\n';
    }
  }

  return csvContent;
};

/**
 * Exports customer profiles to TXT format
 * 
 * @param profiles - Array of customer profiles to export
 * @returns TXT content as string
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
      // First try to get country from address
      let country = profile.addresses?.[0] ? extractCountry(profile.addresses[0]) : undefined;
      
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
        
        // GUARANTEED FIX: Force display all addresses with proper handling
        if (profile.addresses && profile.addresses.length > 0) {
          content += `\nADDRESSES (${profile.addresses.length}):\n`;
          
          // Force iteration through all address slots
          for (let idx = 0; idx < profile.addresses.length; idx++) {
            content += `  ${idx + 1}. `;
            
            const addr = profile.addresses[idx];
            
            // Check if address is null/undefined/empty object
            if (!addr || addr === null || addr === undefined) {
              content += `[Address slot ${idx + 1} is empty]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            // Check if address is an empty object
            if (typeof addr === 'object' && Object.keys(addr).length === 0) {
              content += `[Address slot ${idx + 1} is empty object]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            // Extract address information with comprehensive field checking
            let addressLine = '';
            let city = '';
            let country = '';
            
            // Check all possible address line fields
            addressLine = addr.address || 
                         addr.addressLine1 || 
                         addr.addressLine || 
                         addr.street || 
                         addr.fullAddress || 
                         addr.streetAddress || 
                         '[No address specified]';
            
            // Check all possible city fields
            city = addr.city || 
                   addr.cityName || 
                   addr.town || 
                   addr.locality || 
                   addr.area || 
                   'Unknown';
            
            // Check all possible country fields
            country = addr.country || 
                     addr.countryName || 
                     addr.countryCode || 
                     'United Arab Emirates';
            
            // Display the address information
            content += `${addressLine}\n`;
            content += `     City: ${city}, Country: ${country}\n`;
            
            // Add optional fields if present
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
            if (addr.region && typeof addr.region === 'string' && addr.region.trim()) {
              content += `     Region: ${addr.region}\n`;
            }
            
            content += `\n`;
          }
          
          // Add debug information to see what we actually processed
          content += `\n     [DEBUG: Processed ${profile.addresses.length} address slots]\n`;
          
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
        
        // GUARANTEED FIX: Force display all addresses with proper handling
        if (profile.addresses && profile.addresses.length > 0) {
          content += `\nADDRESSES (${profile.addresses.length}):\n`;
          
          // Force iteration through all address slots
          for (let idx = 0; idx < profile.addresses.length; idx++) {
            content += `  ${idx + 1}. `;
            
            const addr = profile.addresses[idx];
            
            // Check if address is null/undefined/empty object
            if (!addr || addr === null || addr === undefined) {
              content += `[Address slot ${idx + 1} is empty]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            // Check if address is an empty object
            if (typeof addr === 'object' && Object.keys(addr).length === 0) {
              content += `[Address slot ${idx + 1} is empty object]\n`;
              content += `     City: Not available, Country: Not available\n\n`;
              continue;
            }
            
            // Extract address information with comprehensive field checking
            let addressLine = '';
            let city = '';
            let country = '';
            
            // Check all possible address line fields
            addressLine = addr.address || 
                         addr.addressLine1 || 
                         addr.addressLine || 
                         addr.street || 
                         addr.fullAddress || 
                         addr.streetAddress || 
                         '[No address specified]';
            
            // Check all possible city fields
            city = addr.city || 
                   addr.cityName || 
                   addr.town || 
                   addr.locality || 
                   addr.area || 
                   'Unknown';
            
            // Check all possible country fields
            country = addr.country || 
                     addr.countryName || 
                     addr.countryCode || 
                     'United Arab Emirates';
            
            // Display the address information
            content += `${addressLine}\n`;
            content += `     City: ${city}, Country: ${country}\n`;
            
            // Add optional fields if present
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
            if (addr.region && typeof addr.region === 'string' && addr.region.trim()) {
              content += `     Region: ${addr.region}\n`;
            }
            
            content += `\n`;
          }
          
          // Add debug information to see what we actually processed
          content += `\n     [DEBUG: Processed ${profile.addresses.length} address slots]\n`;
          
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

/**
 * Parses uploaded file content based on format
 * 
 * @param content - File content as string
 * @param format - Format to parse ('csv' | 'txt')
 * @returns Array of customer IDs or values extracted from the file
 */
export const parseFileContent = (content: string, format: ExportFormat): string[] => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  if (format === 'csv') {
    // Skip header row and extract first column (Customer ID)
    return lines.slice(1).map(line => {
      const columns = line.split(',');
      return columns[0]?.replace(/"/g, '').trim() || '';
    }).filter(id => id !== '');
  } else {
    // For TXT format, extract customer IDs from "Customer ID: " lines
    return lines
      .filter(line => line.includes('Customer ID:'))
      .map(line => {
        const match = line.match(/Customer ID:\s*(.+)/);
        return match ? match[1].trim() : '';
      })
      .filter(id => id !== '');
  }
};