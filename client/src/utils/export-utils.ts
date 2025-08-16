/**
 * Export Utility Functions
 * 
 * This module provides utilities for exporting customer profile data to various formats
 */

import type { CustomerProfile } from "@shared/schema";
import { formatDate } from "./date-utils";
import { formatCurrency, getActualCurrency } from "./currency-utils";

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

  // Group profiles by country and sort by customer count
  const profilesByCountry = profiles.reduce((acc, profile) => {
    const country = profile.addresses?.[0]?.country || 'Unknown';
    if (!acc[country]) acc[country] = [];
    acc[country].push(profile);
    return acc;
  }, {} as Record<string, CustomerProfile[]>);

  const sortedCountries = Object.entries(profilesByCountry)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([country]) => country);

  // Generate CSV rows
  let csvContent = headers.join(',') + '\n';

  for (const country of sortedCountries) {
    const countryProfiles = profilesByCountry[country];
    
    for (const profile of countryProfiles) {
      const currency = getActualCurrency(profile.latestOrders);
      const primaryAddress = profile.addresses?.[0];
      
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
        primaryAddress?.country || '',
        // First 3 orders
        ...(profile.latestOrders?.slice(0, 3).flatMap(order => [
          order.orderId || '',
          formatDate(order.orderDate),
          formatCurrency(parseFloat(order.totalAmount || '0'), currency),
          order.status || '',
          order.invoiceUrl || ''
        ]) || Array(15).fill(''))
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

  let content = `CUSTOMER PROFILE EXPORT REPORT\n`;
  content += `Generated: ${new Date().toLocaleString()}\n`;
  content += `Total Profiles: ${profiles.length}\n`;
  content += `${'='.repeat(80)}\n\n`;

  // Group by country and sort by customer count
  const profilesByCountry = profiles.reduce((acc, profile) => {
    const country = profile.addresses?.[0]?.country || 'Unknown';
    if (!acc[country]) acc[country] = [];
    acc[country].push(profile);
    return acc;
  }, {} as Record<string, CustomerProfile[]>);

  const sortedCountries = Object.entries(profilesByCountry)
    .sort(([, a], [, b]) => b.length - a.length);

  for (const [country, countryProfiles] of sortedCountries) {
    content += `COUNTRY: ${country} (${countryProfiles.length} customers)\n`;
    content += `${'-'.repeat(60)}\n\n`;

    for (const profile of countryProfiles) {
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
        profile.latestOrders.slice(0, 5).forEach((order, idx) => {
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