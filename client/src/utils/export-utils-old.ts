/**
 * Export Utility Functions
 * 
 * This module provides utilities for exporting customer profile data to various formats
 */

import type { CustomerProfile } from "@shared/schema";
import { formatDate } from "./date-utils";
import { formatCurrency, getActualCurrency, getCountryFromCurrency } from "./currency-utils";
import { categorizeProfiles, getIncompleteReasons } from "./profile-validation";

/**
 * Export formats supported by the application
 */
export type ExportFormat = 'csv' | 'txt';

/**
 * Exports customer profiles to CSV format
 * 
 * @param profiles - Array of customer profiles to export
 * @returns CSV content as string
 */
export const exportToCSV = (profiles: CustomerProfile[]): string => {
  if (profiles.length === 0) return '';

  // CSV Headers
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
    'Profile Status',
    'Missing Fields',
    'Order 1 ID',
    'Order 1 Date',
    'Order 1 Amount',
    'Order 1 Status',
    'Order 1 Invoice URL',
    'Order 2 ID',
    'Order 2 Date', 
    'Order 2 Amount',
    'Order 2 Status',
    'Order 2 Invoice URL',
    'Order 3 ID',
    'Order 3 Date',
    'Order 3 Amount',
    'Order 3 Status', 
    'Order 3 Invoice URL'
  ];

  // Categorize profiles into complete and incomplete
  const { complete, incomplete } = categorizeProfiles(profiles);

  // Group profiles by country with improved country detection
  const groupProfilesByCountry = (profileList: CustomerProfile[]) => {
    return profileList.reduce((acc, profile) => {
      // First try to get country from address
      let country = profile.addresses?.[0]?.country;
      
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
      const incompleteReasons = getIncompleteReasons(profile);
      
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
        `"${primaryAddress?.address || ''}"`,
        primaryAddress?.city || '',
        primaryAddress?.country || country,
        'Complete',
        '',
        // First 3 orders with proper amount and status extraction
        ...(profile.latestOrders?.slice(0, 3).flatMap((order: any) => {
          // Extract amount from transactionAmount string or number
          let orderAmount = 0;
          if (order.transactionAmount) {
            if (typeof order.transactionAmount === 'string') {
              const matches = order.transactionAmount.match(/[\d.]+/);
              if (matches) {
                orderAmount = parseFloat(matches[0]);
              }
            } else if (typeof order.transactionAmount === 'number') {
              orderAmount = order.transactionAmount;
            }
          }
          
          // Extract status from various status fields
          const orderStatus = order.shipStatus || 
                             order.orderStatus || 
                             order.status || 
                             order.deliveryStatus || 
                             'Unknown';
          
          return [
            order.orderId || '',
            formatDate(order.orderDate || order.createDate),
            formatCurrency(orderAmount, currency),
            orderStatus,
            order.invoiceUrl || ''
          ];
        }) || Array(15).fill(''))
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
      const incompleteReasons = getIncompleteReasons(profile);
      
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
        `"${primaryAddress?.address || ''}"`,
        primaryAddress?.city || '',
        primaryAddress?.country || country,
        'Incomplete',
        `"${incompleteReasons.join('; ')}"`,
        // First 3 orders with proper amount and status extraction for incomplete profiles
        ...(profile.latestOrders?.slice(0, 3).flatMap((order: any) => {
          // Extract amount from transactionAmount string or number
          let orderAmount = 0;
          if (order.transactionAmount) {
            if (typeof order.transactionAmount === 'string') {
              const matches = order.transactionAmount.match(/[\d.]+/);
              if (matches) {
                orderAmount = parseFloat(matches[0]);
              }
            } else if (typeof order.transactionAmount === 'number') {
              orderAmount = order.transactionAmount;
            }
          }
          
          // Extract status from various status fields
          const orderStatus = order.shipStatus || 
                             order.orderStatus || 
                             order.status || 
                             order.deliveryStatus || 
                             'Unknown';
          
          return [
            order.orderId || '',
            formatDate(order.orderDate || order.createDate),
            formatCurrency(orderAmount, currency),
            orderStatus,
            order.invoiceUrl || ''
          ];
        }) || Array(15).fill(''))
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
      let country = profile.addresses?.[0]?.country;
      
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
        
        if (profile.addresses && profile.addresses.length > 0) {
          content += `\nADDRESSES (${profile.addresses.length}):\n`;
          profile.addresses.forEach((addr, idx) => {
            content += `  ${idx + 1}. ${addr.address || 'No address'}\n`;
            content += `     City: ${addr.city || 'Unknown'}, Country: ${addr.country || 'Unknown'}\n`;
          });
        }
        
        if (profile.latestOrders && profile.latestOrders.length > 0) {
          content += `\nRECENT ORDERS (${Math.min(profile.latestOrders.length, 5)}):\n`;
          profile.latestOrders.slice(0, 5).forEach((order: any, idx) => {
            content += `  ${idx + 1}. Order ${order.orderId || 'Unknown'}\n`;
            content += `     Date: ${formatDate(order.orderDate)}\n`;
            content += `     Amount: ${formatCurrency(parseFloat(order.totalAmount || '0'), currency)}\n`;
            content += `     Status: ${order.status || 'Unknown'}\n`;
            if (order.invoiceUrl) {
              content += `     Invoice: ${order.invoiceUrl}\n`;
            }
          });
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
        
        if (profile.addresses && profile.addresses.length > 0) {
          content += `\nADDRESSES (${profile.addresses.length}):\n`;
          profile.addresses.forEach((addr, idx) => {
            content += `  ${idx + 1}. ${addr.address || 'No address'}\n`;
            content += `     City: ${addr.city || 'Unknown'}, Country: ${addr.country || 'Unknown'}\n`;
          });
        } else {
          content += `\nADDRESSES: None saved\n`;
        }
        
        if (profile.latestOrders && profile.latestOrders.length > 0) {
          content += `\nRECENT ORDERS (${Math.min(profile.latestOrders.length, 5)}):\n`;
          profile.latestOrders.slice(0, 5).forEach((order: any, idx) => {
            content += `  ${idx + 1}. Order ${order.orderId || 'Unknown'}\n`;
            content += `     Date: ${formatDate(order.orderDate)}\n`;
            content += `     Amount: ${formatCurrency(parseFloat(order.totalAmount || '0'), currency)}\n`;
            content += `     Status: ${order.status || 'Unknown'}\n`;
            if (order.invoiceUrl) {
              content += `     Invoice: ${order.invoiceUrl}\n`;
            }
          });
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
 * @param file - File to parse
 * @param format - Expected format ('csv' or 'txt')
 * @returns Promise resolving to parsed customer IDs
 */
export const parseUploadedFile = async (file: File, format: ExportFormat): Promise<string[]> => {
  const content = await file.text();
  const customerIds: string[] = [];

  if (format === 'csv') {
    const lines = content.split('\n').filter(line => line.trim());
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns[0] && columns[0].trim()) {
        customerIds.push(columns[0].trim());
      }
    }
  } else if (format === 'txt') {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('Customer ID:')) {
        const match = line.match(/Customer ID:\s*(.+)/);
        if (match && match[1]) {
          customerIds.push(match[1].trim());
        }
      }
    }
  }

  // Remove duplicates
  return Array.from(new Set(customerIds));
};