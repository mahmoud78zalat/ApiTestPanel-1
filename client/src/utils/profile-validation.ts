/**
 * Profile Validation Utility Functions
 * 
 * This module provides utilities for validating and categorizing customer profiles
 */

import type { CustomerProfile } from "@shared/schema";

/**
 * Helper function to check if profile has fallback address from shipping data
 */
const hasFallbackAddress = (profile: CustomerProfile): boolean => {
  if (!profile.latestOrders?.length) return false;
  
  // Look for shipping address in latest orders
  for (const order of profile.latestOrders.slice(0, 3)) {
    // Check enriched data first (priority 1)
    if (order?.enrichedData?.shippingAddress) {
      return true;
    }
    // Fallback to direct order properties (priority 2)
    else if (order?.shippingAddress) {
      return true;
    }
  }
  
  return false;
};

/**
 * Checks if a customer profile is considered incomplete
 * A profile is incomplete if it's missing address (including fallback), birth date, or gender
 * 
 * @param profile - Customer profile to validate
 * @returns true if profile is incomplete, false otherwise
 */
export const isIncompleteProfile = (profile: CustomerProfile): boolean => {
  // Check if no addresses are saved (considering fallback addresses)
  const hasNoAddress = (!profile.addresses || profile.addresses.length === 0) && !hasFallbackAddress(profile);
  
  // Check if birth date is missing
  const hasNoBirthDate = !profile.birthDate || profile.birthDate.trim() === '';
  
  // Check if gender is missing
  const hasNoGender = !profile.gender || profile.gender.trim() === '';
  
  // Profile is incomplete if any of these essential fields are missing
  return hasNoAddress || hasNoBirthDate || hasNoGender;
};

/**
 * Categorizes profiles into complete and incomplete groups
 * 
 * @param profiles - Array of customer profiles
 * @returns Object with complete and incomplete profile arrays
 */
export const categorizeProfiles = (profiles: CustomerProfile[]) => {
  const complete: CustomerProfile[] = [];
  const incomplete: CustomerProfile[] = [];
  
  profiles.forEach(profile => {
    if (isIncompleteProfile(profile)) {
      incomplete.push(profile);
    } else {
      complete.push(profile);
    }
  });
  
  return { complete, incomplete };
};

/**
 * Gets specific incomplete profile reasons for display
 * 
 * @param profile - Customer profile to analyze
 * @returns Array of strings describing what's missing
 */
export const getIncompleteReasons = (profile: CustomerProfile): string[] => {
  const reasons: string[] = [];
  
  // Check for addresses including fallback logic
  if ((!profile.addresses || profile.addresses.length === 0) && !hasFallbackAddress(profile)) {
    reasons.push('No saved addresses');
  }
  
  if (!profile.birthDate || profile.birthDate.trim() === '') {
    reasons.push('Missing birth date');
  }
  
  if (!profile.gender || profile.gender.trim() === '') {
    reasons.push('Missing gender');
  }
  
  return reasons;
};

/**
 * Counts incomplete profiles by missing field type
 * 
 * @param profiles - Array of customer profiles
 * @returns Object with counts for each missing field type
 */
export const getIncompleteStats = (profiles: CustomerProfile[]) => {
  let missingAddress = 0;
  let missingBirthDate = 0;
  let missingGender = 0;
  let totalIncomplete = 0;
  
  profiles.forEach(profile => {
    const incomplete = isIncompleteProfile(profile);
    if (incomplete) {
      totalIncomplete++;
      
      if ((!profile.addresses || profile.addresses.length === 0) && !hasFallbackAddress(profile)) {
        missingAddress++;
      }
      if (!profile.birthDate || profile.birthDate.trim() === '') {
        missingBirthDate++;
      }
      if (!profile.gender || profile.gender.trim() === '') {
        missingGender++;
      }
    }
  });
  
  return {
    totalIncomplete,
    missingAddress,
    missingBirthDate,
    missingGender,
    totalProfiles: profiles.length,
    completeProfiles: profiles.length - totalIncomplete
  };
};